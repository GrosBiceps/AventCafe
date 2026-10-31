"use client";

import { useState, type CSSProperties } from "react";
import { PROFILE_LABELS, type Act, type Candidate, type Coffee, type DayCard, type ProfileKey } from "@/lib/types";
import { readRatings, setRating, useAvent, type Ratings } from "@/lib/storage";

export type ProfileMode = "empty" | "animate" | "instant";

type Resolved = {
  coffee: Coffee | null;
  act: Act;
  finale?: Act;
  rateable: boolean;
  duel?: Coffee[];
};

/** Favoris : étoiles décroissantes, égalité départagée par le café dégusté le plus récemment. */
function favorites(candidates: Candidate[], ratings: Ratings): Candidate[] {
  return candidates
    .filter((c) => (ratings[c.id]?.stars ?? 0) > 0)
    .sort((a, b) => (ratings[b.id]!.stars! - ratings[a.id]!.stars!) || b.lastDay - a.lastDay);
}

function resolve(card: DayCard, ratings: Ratings): Resolved {
  if (card.kind === "coffee") {
    return { coffee: card.coffee, act: card.act, finale: card.finale, rateable: card.rateable };
  }
  const favs = favorites(card.candidates, ratings);
  if (card.special === "duel") {
    return { coffee: null, duel: favs.slice(0, 2), act: { title: card.title, text: card.text }, rateable: false };
  }
  const pick = card.special === "fav1" ? favs[0] : favs[1];
  return {
    coffee: pick ?? null,
    act: { title: card.title, text: pick ? card.text : card.textMissing },
    rateable: Boolean(pick),
  };
}

type SheetProps = { card: DayCard; profile: ProfileMode };

export default function Sheet({ card, profile }: SheetProps) {
  // Favori figé à l’ouverture : changer une note ne doit pas remplacer le café affiché.
  const [r] = useState(() => resolve(card, readRatings()));
  const { ratings } = useAvent();
  const c = r.coffee;

  let head;
  if (c) {
    head = (
      <>
        <div className="sheet-roaster">{c.roaster}</div>
        <h2>{c.name}</h2>
        <p className="sheet-origin">{c.origin}</p>
      </>
    );
  } else if (r.duel) {
    head = (
      <>
        <div className="sheet-roaster">Tes deux favoris</div>
        <h2>{r.duel.length === 2 ? `${r.duel[0].name} contre ${r.duel[1].name}` : "Le grand duel"}</h2>
      </>
    );
  } else {
    head = (
      <>
        <div className="sheet-roaster">Au choix</div>
        <h2>Ton café préféré</h2>
      </>
    );
  }

  return (
    <article className="sheet">
      <span className="ribbon r1" />
      <span className="ribbon r2" />
      <div className="sheet-head">
        <div className="sheet-day">{card.n === 0 ? "Essai" : card.n}</div>
        {head}
      </div>

      <div className="ritual">
        <h3>{r.act.title}</h3>
        <p>{r.act.text}</p>
        {r.act.tip && <p className="tip">{r.act.tip}</p>}
      </div>
      {r.finale && (
        <div className="ritual finale">
          <h3>{r.finale.title}</h3>
          <p>{r.finale.text}</p>
        </div>
      )}

      {c && (
        <>
          <dl className="facts">
            <div>
              <dt>Origine</dt>
              <dd>{c.origin}</dd>
            </div>
            <div>
              <dt>Traitement</dt>
              <dd>{c.process}</dd>
            </div>
            <div>
              <dt>Torréfaction</dt>
              <dd>{c.roast}</dd>
            </div>
          </dl>
          {c.notes.length > 0 && (
            <ul className="notes" aria-label="Notes aromatiques">
              {c.notes.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          )}
          {c.desc && <p className="desc">{c.desc}</p>}

          <div className={`profile ${profile}`} role="group" aria-label="Profil en tasse">
            {(Object.keys(PROFILE_LABELS) as ProfileKey[]).map((k, ri) => {
              const v = c.profile[k];
              return (
                <div className="prow" key={k}>
                  <span>{PROFILE_LABELS[k]}</span>
                  {v ? (
                    <div className="pbeans" role="img" aria-label={`${v} sur 5`}>
                      {[0, 1, 2, 3, 4].map((i) => (
                        <span
                          key={i}
                          className={i < v ? "pb v" : "pb"}
                          // Remplissage grain par grain : 120 ms par ligne, 90 ms par grain (maquette).
                          style={{ "--d": `${ri * 120 + i * 90}ms` } as CSSProperties}
                        />
                      ))}
                    </div>
                  ) : (
                    <span className="unknown">à remplir</span>
                  )}
                </div>
              );
            })}
          </div>

          {r.rateable && <Rate id={c.id} stars={ratings[c.id]?.stars ?? 0} note={ratings[c.id]?.note ?? ""} />}
          {c.estimated && (
            <p className="disclaimer">Profil indicatif établi d’après la description du torréfacteur.</p>
          )}
        </>
      )}
    </article>
  );
}

function Rate({ id, stars, note }: { id: string; stars: number; note: string }) {
  return (
    <div className="rate">
      <h3>Ta note pour ce café</h3>
      <div className="stars" role="group" aria-label="Note sur 5">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            type="button"
            className={stars >= s ? "on" : undefined}
            aria-label={`${s} sur 5`}
            aria-pressed={stars === s}
            onClick={() => setRating(id, { stars: s })}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        placeholder="Ce que tu as senti, goûté, aimé…"
        aria-label="Tes notes de dégustation"
        value={note}
        onChange={(e) => setRating(id, { note: e.target.value })}
      />
    </div>
  );
}
