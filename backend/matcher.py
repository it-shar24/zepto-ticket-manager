"""
matcher.py
----------
TF-IDF + cosine similarity matcher over the resolved-tickets history.
Built once at startup (fit on the 300 resolved ticket descriptions),
then reused for every new ticket at query time.
"""

from dataclasses import dataclass

import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


@dataclass
class Precedent:
    ticket_id: str
    description: str
    category: str
    resolution_action: str
    resolution_note: str
    csat: float
    similarity: float


class TfidfMatcher:
    def __init__(self, resolved_df: pd.DataFrame, top_k: int = 3):
        self.resolved_df = resolved_df.reset_index(drop=True)
        self.top_k = top_k
        # word-level TF-IDF, strip common English stopwords, allow unigrams+bigrams
        # so short phrases like "milk packet missing" match well.
        self.vectorizer = TfidfVectorizer(
            stop_words="english",
            ngram_range=(1, 2),
            min_df=1,
        )
        self.matrix = self.vectorizer.fit_transform(self.resolved_df["description"])

    def top_matches(self, query_text: str) -> list[Precedent]:
        query_vec = self.vectorizer.transform([query_text])
        sims = cosine_similarity(query_vec, self.matrix)[0]

        top_idx = sims.argsort()[::-1][: self.top_k]
        results = []
        for idx in top_idx:
            row = self.resolved_df.iloc[idx]
            results.append(
                Precedent(
                    ticket_id=row["ticket_id"],
                    description=row["description"],
                    category=row["category"],
                    resolution_action=row["resolution_action"],
                    resolution_note=row["resolution_note"],
                    csat=float(row["csat"]),
                    similarity=round(float(sims[idx]), 4),
                )
            )
        return results
