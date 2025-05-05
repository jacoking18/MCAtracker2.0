from flask import Flask, render_template, request, redirect, url_for
from datetime import datetime, timedelta

app = Flask(__name__)

# In-memory storage
users = ["albert", "jacobo", "matty", "joel", "zack", "juli"]
deals = [
    {"id": "D101", "name": "Green Cafe", "size": 30000, "rate": 1.49, "term": 30},
    {"id": "D102", "name": "FastFit Gym", "size": 50000, "rate": 1.45, "term": 60},
    {"id": "D103", "name": "TechNova Labs", "size": 100000, "rate": 1.5, "term": 90}
]
syndications = {
    "D101": {"albert": 40, "jacobo": 60},
    "D102": {"matty": 30, "joel": 30, "zack": 40},
    "D103": {"juli": 50, "jacobo": 50}
}
payments = {}

def init_payments():
    for deal in deals:
        pid = deal["id"]
        term = deal["term"]
        daily = round(deal["size"] * deal["rate"] / term, 2)
        payments[pid] = [{"date": (datetime.today() + timedelta(days=i)).date(), "amount": daily, "status": ""} for i in range(term)]

init_payments()

@app.route("/")
def index():
    return render_template("dashboard.html", deals=deals, payments=payments, users=users, syndications=syndications)

@app.route("/add_user", methods=["POST"])
def add_user():
    username = request.form.get("username").strip().lower()
    if username and username not in users:
        users.append(username)
    return redirect(url_for("index"))

@app.route("/add_deal", methods=["POST"])
def add_deal():
    name = request.form.get("name")
    size = int(request.form.get("size"))
    rate = float(request.form.get("rate"))
    term = int(request.form.get("term"))
    new_id = f"D{100 + len(deals)}"
    new_deal = {"id": new_id, "name": name, "size": size, "rate": rate, "term": term}
    deals.append(new_deal)

    # Init payment schedule
    daily = round(size * rate / term, 2)
    payments[new_id] = [{"date": (datetime.today() + timedelta(days=i)).date(), "amount": daily, "status": ""} for i in range(term)]
    return redirect(url_for("index"))

@app.route("/assign_syndication", methods=["POST"])
def assign_syndication():
    deal_id = request.form.get("deal_id")
    syndications[deal_id] = {}
    for user in users:
        pct_str = request.form.get(f"percent_{user}")
        if pct_str:
            pct = int(pct_str)
            if pct > 0:
                syndications[deal_id][user] = pct
    return redirect(url_for("index"))

if __name__ == "__main__":
    app.run(debug=True)