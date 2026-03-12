from flask import Flask, jsonify
app = Flask(__name__)

@app.route('/api/test')
def test():
    return jsonify({"status": "ok", "message": "Vercel Python functions are working"})

# For local testing if run directly
if __name__ == "__main__":
    app.run(port=5000)
