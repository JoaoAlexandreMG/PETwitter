from flask import Flask, request, jsonify, render_template, redirect, url_for, session
from flask_bcrypt import Bcrypt
import psycopg2
from psycopg2 import sql
import base64
from functools import wraps

app = Flask(__name__)
app.secret_key = "your_secret_key"  # Necessário para usar sessões
bcrypt = Bcrypt(app)

# Configurações do banco de dados
DB_NAME = "pet_eletrica"
DB_USER = "postgres"
DB_PASSWORD = "2584"
DB_HOST = "localhost"


# Conexão com o banco de dados
def get_db_connection():
    return psycopg2.connect(
        dbname=DB_NAME, user=DB_USER, password=DB_PASSWORD, host=DB_HOST
    )


# Função de decorador para verificar autenticação
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if "user_id" not in session:
            return redirect(url_for("index"))
        return f(*args, **kwargs)

    return decorated_function


@app.route("/")
def index():
    return render_template("login.html")


@app.route("/feed")
@login_required
def feed():
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT tweets.id, tweets.conteudo, users.username, users.photo, tweets.user_id "
        "FROM tweets "
        "JOIN users ON tweets.user_id = users.id "
        "ORDER BY tweets.criado_em DESC;"
    )
    tweets = cur.fetchall()
    cur.close()
    conn.close()

    tweets_data = [
        {
            "id": tweet[0],
            "conteudo": tweet[1],
            "username": tweet[2],
            "avatar": base64.b64encode(tweet[3]).decode("utf-8") if tweet[3] else None,
            "user_id": tweet[4],
        }
        for tweet in tweets
    ]

    return render_template(
        "feed.html", tweets=tweets_data, current_user_id=session.get("user_id")
    )


@app.route("/post_tweet", methods=["POST"])
@login_required
def post_tweet():
    user_id = session["user_id"]
    conteudo = request.form.get("tweet-text")

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute(
            sql.SQL("INSERT INTO tweets (user_id, conteudo) VALUES (%s, %s)"),
            [user_id, conteudo],
        )
        conn.commit()
        return jsonify({"success": True}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cur.close()
        conn.close()


@app.route("/delete_tweet/<int:tweet_id>", methods=["DELETE"])
@login_required
def delete_tweet(tweet_id):
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Verificar se o usuário é o dono do tweet
        cur.execute("SELECT user_id FROM tweets WHERE id = %s", [tweet_id])
        tweet = cur.fetchone()

        if tweet and tweet[0] == session["user_id"]:
            cur.execute("DELETE FROM tweets WHERE id = %s", [tweet_id])
            conn.commit()
            return jsonify({"success": True}), 200
        else:
            return jsonify({"message": "Não autorizado"}), 403
    except Exception as e:
        return jsonify({"message": str(e)}), 500
    finally:
        cur.close()
        conn.close()


@app.route("/edit_profile", methods=["POST"])
@login_required
def edit_profile():
    user_id = session["user_id"]
    username = request.form.get("username")
    email = request.form.get("email")
    current_password = request.form.get("current-password")
    new_password = request.form.get("new-password")
    profile_picture = request.files.get("profile-picture")

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        if current_password:
            cur.execute("SELECT password_hash FROM users WHERE id = %s", [user_id])
            user = cur.fetchone()
            if not user or not bcrypt.check_password_hash(user[0], current_password):
                return jsonify({"message": "Senha atual incorreta!"}), 400

        if new_password:
            hashed_password = bcrypt.generate_password_hash(new_password).decode(
                "utf-8"
            )
            cur.execute(
                "UPDATE users SET password_hash = %s WHERE id = %s",
                [hashed_password, user_id],
            )

        if username:
            cur.execute(
                "UPDATE users SET username = %s WHERE id = %s", [username, user_id]
            )

        if email:
            cur.execute("UPDATE users SET email = %s WHERE id = %s", [email, user_id])

        if profile_picture and allowed_file(profile_picture.filename):
            profile_picture_data = profile_picture.read()
            cur.execute(
                "UPDATE users SET photo = %s WHERE id = %s",
                [profile_picture_data, user_id],
            )

        conn.commit()
        return jsonify({"success": True})
    except Exception as e:
        conn.rollback()
        return jsonify({"message": str(e)}), 500
    finally:
        cur.close()
        conn.close()


@app.route("/create_account", methods=["POST"])
def create_account():
    name = request.form.get("create-name")
    username = request.form.get("create-username")
    email = request.form.get("create-email")
    password = request.form.get("create-password")
    photo = request.files.get("photo")  # Foto do usuário

    hashed_password = bcrypt.generate_password_hash(password).decode("utf-8")

    photo_data = None
    if photo and allowed_file(photo.filename):
        photo_data = photo.read()

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute(
            sql.SQL(
                "INSERT INTO users (name, username, email, password_hash, photo) VALUES (%s, %s, %s, %s, %s)"
            ),
            [name, username, email, hashed_password, photo_data],
        )
        conn.commit()
        return redirect(url_for("index"))
    except Exception as e:
        conn.rollback()
        return jsonify({"message": f"Erro ao criar conta: {e}"}), 500
    finally:
        cur.close()
        conn.close()


@app.route("/login", methods=["POST"])
def login():
    username = request.form.get("login-username")
    password = request.form.get("login-password")

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        sql.SQL("SELECT id, password_hash FROM users WHERE username = %s"), [username]
    )
    user = cur.fetchone()
    cur.close()
    conn.close()

    if not user:
        return jsonify({"message": "Usuário inexistente!"}), 401
    if bcrypt.check_password_hash(user[1], password):
        session["user_id"] = user[0]  # Armazena o ID do usuário na sessão
        return redirect(url_for("feed"))
    else:
        return jsonify({"message": "Senha incorreta!"}), 401


@app.route("/logout")
def logout():
    session.pop("user_id", None)  # Remove o ID do usuário da sessão
    return redirect(url_for("index"))


@app.route("/get_profile_info", methods=["GET"])
@login_required
def get_profile_info():
    user_id = session["user_id"]

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT username, email, photo FROM users WHERE id = %s", [user_id])
    user_info = cur.fetchone()
    cur.close()
    conn.close()

    if user_info:
        username, email, photo = user_info
        photo_base64 = base64.b64encode(photo).decode("utf-8") if photo else None
        return jsonify({"username": username, "email": email, "photo": photo_base64})
    else:
        return jsonify({"message": "Informações do perfil não encontradas!"}), 404


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in {
        "png",
        "jpg",
        "jpeg",
        "gif",
    }


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
