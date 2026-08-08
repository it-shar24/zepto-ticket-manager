"""
data_loader.py
---------------
Loads the three CSVs into memory once at startup. No database.

Expected files (in backend/data/):
  - resolved_tickets.csv : ticket_id, category, description, resolution_action,
                            resolution_note, time_to_resolve_min, csat
  - new_tickets.csv      : ticket_id, created_at, order_id, description
  - orders_context.csv   : order_id, items, value_inr, delivery_time_min, delivery_status
"""

from pathlib import Path
import pandas as pd

DATA_DIR = Path(__file__).parent / "data"

RESOLVED_PATH = DATA_DIR / "resolved_tickets.csv"
NEW_PATH = DATA_DIR / "new_tickets.csv"
ORDERS_PATH = DATA_DIR / "orders_context.csv"


class Store:
    """Simple in-memory holder for the three dataframes."""

    def __init__(self):
        self.resolved: pd.DataFrame = pd.DataFrame()
        self.new: pd.DataFrame = pd.DataFrame()
        self.orders: pd.DataFrame = pd.DataFrame()

    def load(self):
        self.resolved = pd.read_csv(RESOLVED_PATH)
        self.new = pd.read_csv(NEW_PATH)
        self.orders = pd.read_csv(ORDERS_PATH)

        # basic cleanup
        self.resolved["description"] = self.resolved["description"].fillna("").astype(str)
        self.new["description"] = self.new["description"].fillna("").astype(str)

        # index orders by order_id for O(1) lookup
        self.orders_by_id = self.orders.set_index("order_id").to_dict(orient="index")

        return self

    def order_lookup(self, order_id: str) -> dict | None:
        return self.orders_by_id.get(order_id)


# module-level singleton, populated by main.py's startup event
store = Store()
