import { useEffect, useMemo, useState } from "react";
import { profileQuestions } from "../lib/participantProfileQuestions";
import { emptyProfile, participantProfiles } from "../services/participantProfileService";

type ProfileEditorProps = { sessionId: string; userId: string; sessionCreatedAt: string };

export default function ParticipantProfilePanel(props: ProfileEditorProps) {
  const [opened, setOpened] = useState(false);
  return (
    <details className="glass mb-6 rounded-xl border border-white/10 px-4 py-3"
      onToggle={(event) => { if (event.currentTarget.open) setOpened(true); }}>
      <summary className="cursor-pointer font-medium text-slate-200">Min deltakerprofil</summary>
      {opened && <ProfileEditor {...props} />}
    </details>
  );
}

const fieldStyle = "mt-1 min-h-20 w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-slate-100";
const buttonStyle = "rounded-lg border border-white/15 bg-slate-800 px-3 py-2 text-white hover:bg-slate-700 disabled:opacity-50";
const primaryStyle = "rounded-lg bg-amber-500 px-3 py-2 font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-50";

function ProfileEditor({ sessionId, userId, sessionCreatedAt }: ProfileEditorProps) {
  const [profile, setProfile] = useState(emptyProfile);
  const [exists, setExists] = useState(false);
  const [previousAvailable, setPreviousAvailable] = useState(false);
  const [mode, setMode] = useState<"edit" | "review" | "saved">("edit");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const service = useMemo(() => participantProfiles(sessionId, userId, sessionCreatedAt), [sessionId, userId, sessionCreatedAt]);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  useEffect(() => {
    let stopped = false;
    service.load()
      .then((data) => {
        if (stopped) return;
        if (data.profile) {
          setProfile(data.profile);
          setExists(true);
          setMode(data.profile.ready ? "saved" : "edit");
        }
        setPreviousAvailable(data.previousAvailable);
      })
      .catch((cause) => {
        if (!stopped) {
          setError(cause instanceof Error ? cause.message : "Kunne ikke hente profilen.");
          setLoadFailed(true);
        }
      })
      .finally(() => {
        if (!stopped) setLoading(false);
      });
    return () => {
      stopped = true;
    };
  }, [service, loadAttempt]);

  async function perform(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Prøv igjen.");
    } finally {
      setBusy(false);
    }
  }

  async function save(ready: boolean) {
    setProfile(await service.save(profile, ready));
    setExists(true);
  }

  function setAnswer(index: number, answer: string) {
    setProfile((current) => ({
      ...current,
      answers: current.answers.map((value, position) =>
        position === index ? answer : value,
      ),
    }));
  }

  function setFollowupAnswer(index: number, answer: string) {
    setProfile((current) => ({
      ...current,
      followups: current.followups.map((item, position) =>
        position === index ? { ...item, answer } : item,
      ),
    }));
  }

  if (loading) return <p className="mt-3 text-slate-300" role="status">Henter profilen …</p>;
  if (loadFailed) return (
    <div className="mt-3 space-y-2">
      <p className="text-amber-300" role="alert">{error}</p>
      <button type="button" className={buttonStyle} onClick={() => {
        setError("");
        setLoadFailed(false);
        setLoading(true);
        setLoadAttempt(attempt => attempt + 1);
      }}>Prøv igjen</button>
    </div>
  );
  return (
    <section className="mt-4 max-w-2xl space-y-4 text-sm text-slate-200" aria-label="Deltakerprofil">
      <p>
        Alt er frivillig. Svarene kan bli lest opp og brukt til humor foran
        gruppen. Bare du kan se og redigere profilen direkte.
      </p>
      {error && <p className="text-amber-300" role="alert">{error}</p>}
      {!exists && previousAvailable && (
        <div className="space-y-2">
          <p>
            Du har en profil fra en tidligere kveld. Du kan kopiere svar og
            grenser hit og redigere kopien.
          </p>
          <button
            className={buttonStyle}
            disabled={busy}
            onClick={() =>
              perform(async () => {
                setProfile(await service.reuse());
                setExists(true);
                setMode("edit");
              })
            }
          >
            Bruk forrige profil
          </button>
        </div>
      )}
      {mode === "edit" ? (
        <form className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            perform(async () => {
              await save(false);
              setMode("review");
            });
          }}
        >
          <p>Skriv gjerne kort. Du kan hoppe over alle spørsmål.</p>
          {profileQuestions.map((question, index) => (
            <label className="block" key={question}>
              {question}
              <textarea
                className={fieldStyle}
                disabled={busy}
                maxLength={500}
                value={profile.answers[index]}
                onChange={(event) => setAnswer(index, event.target.value)}
              />
            </label>
          ))}
          {profile.followups.map((item, index) => (
            <label className="block" key={index}>
              {item.question}
              <textarea
                className={fieldStyle}
                disabled={busy}
                maxLength={500}
                value={item.answer}
                onChange={(event) =>
                  setFollowupAnswer(index, event.target.value)
                }
              />
            </label>
          ))}
          {profile.followups.length < 2 &&
            profile.answers.some((answer) => answer.trim()) && (
              <button
                type="button"
                className={buttonStyle}
                disabled={busy}
                onClick={() =>
                  perform(async () => {
                    await save(false);
                    setProfile(await service.followUp());
                  })
                }
              >
                Få et oppfølgingsspørsmål ({profile.followups.length}/2)
              </button>
            )}
          <label className="block">
            Er det noe nissen skal holde seg unna?
            <textarea
              className={fieldStyle}
              disabled={busy}
              maxLength={1000}
              value={profile.boundaries}
              onChange={(event) =>
                setProfile((current) => ({
                  ...current,
                  boundaries: event.target.value,
                }))
              }
            />
          </label>
          <p className="text-slate-400">
            Dette er en grense nissen skal følge. Det blir aldri brukt som
            vitsemateriale.
          </p>
          <button className={primaryStyle} disabled={busy}>Se gjennom profilen</button>
        </form>
      ) : (
        <div className="space-y-4">
          {mode === "saved" && (
            <p role="status">Profilen er lagret og klar til bruk.</p>
          )}
          <h3 className="font-semibold text-white">Se gjennom profilen</h3>
          {profileQuestions.map((question, index) => (
            <div key={question}>
              <strong>{question}</strong>
              <p className="whitespace-pre-wrap break-words">{profile.answers[index] || "Hoppet over"}</p>
            </div>
          ))}
          {profile.followups.map((item, index) => (
            <div key={index}>
              <strong>{item.question}</strong>
              <p className="whitespace-pre-wrap break-words">{item.answer || "Hoppet over"}</p>
            </div>
          ))}
          <div className="rounded-lg border border-amber-500/25 p-3">
            <strong>Dette skal nissen holde seg unna</strong>
            <p className="whitespace-pre-wrap break-words">{profile.boundaries || "Ingen grenser lagt til"}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className={buttonStyle}
              disabled={busy}
              onClick={() => setMode("edit")}
            >
              Rediger svar
            </button>
            {mode === "review" && (
              <button
                className={primaryStyle}
                disabled={busy}
                onClick={() =>
                  perform(async () => {
                    await save(true);
                    setMode("saved");
                  })
                }
              >
                Bruk denne profilen
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
