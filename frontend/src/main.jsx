import React from "react";
import ReactDOM from "react-dom/client";
import { io } from "socket.io-client";

const BACKEND_URL = window.__APP_CONFIG__?.BACKEND_URL || "https://DEINE-RENDER-URL.onrender.com";
const socket = io(BACKEND_URL);

const styles = {
  app: { maxWidth: 980, margin: "0 auto", padding: 16 },
  card: { border: "1px solid #334155", borderRadius: 16, padding: 16, background: "#111827", marginBottom: 16 },
  input: { width: "100%", padding: 12, borderRadius: 12, marginBottom: 8, border: "1px solid #334155", background: "#0b1220", color: "#f8fafc" },
  button: { padding: 12, borderRadius: 12, border: "none", background: "#16a34a", color: "white", fontWeight: 700, cursor: "pointer" },
  secondaryButton: { padding: 12, borderRadius: 12, border: "1px solid #334155", background: "#0b1220", color: "white", fontWeight: 700, cursor: "pointer" },
  row: { display: "flex", gap: 8, flexWrap: "wrap" },
  score: { border: "1px solid #334155", borderRadius: 12, padding: 12, background: "#0b1220", minWidth: 160 },
  answer: { display: "block", width: "100%", padding: 12, borderRadius: 12, border: "1px solid #334155", background: "#0b1220", color: "#f8fafc", textAlign: "left", marginBottom: 8, cursor: "pointer" },
  timerOuter: { height: 14, borderRadius: 999, overflow: "hidden", background: "#1e293b", marginBottom: 12 },
  timerInner: { height: "100%", background: "linear-gradient(90deg,#22c55e,#f59e0b,#ef4444)" }
};

function App() {
  const [name, setName] = React.useState("");
  const [me, setMe] = React.useState(null);
  const [onlineCount, setOnlineCount] = React.useState(0);
  const [friendId, setFriendId] = React.useState("");
  const [friends, setFriends] = React.useState([]);
  const [inviteIds, setInviteIds] = React.useState("");
  const [lobby, setLobby] = React.useState(null);
  const [invitation, setInvitation] = React.useState(null);
  const [highscores, setHighscores] = React.useState([]);
  const [accountHighscores, setAccountHighscores] = React.useState([]);
  const [question, setQuestion] = React.useState(null);
  const [results, setResults] = React.useState(null);
  const [roundResult, setRoundResult] = React.useState(null);
  const [hint, setHint] = React.useState("");
  const [removedChoices, setRemovedChoices] = React.useState([]);
  const [timeLeftMs, setTimeLeftMs] = React.useState(0);

  React.useEffect(() => {
    socket.on("registered", (user) => { setMe(user); setFriends(user.friends || []); });
    socket.on("profile_updated", (user) => { setMe(user); setFriends(user.friends || []); });
    socket.on("online_count", ({ onlineCount }) => setOnlineCount(onlineCount));
    socket.on("invitation_received", (payload) => setInvitation(payload));
    socket.on("lobby_update", (payload) => setLobby(payload));
    socket.on("highscores_updated", (payload) => setHighscores(payload));
    socket.on("account_highscores_updated", (payload) => setAccountHighscores(payload));
    socket.on("game_question", (payload) => { setQuestion(payload); setRoundResult(null); setHint(""); setRemovedChoices([]); });
    socket.on("round_result", (payload) => setRoundResult(payload));
    socket.on("joker_result", (payload) => {
      if (payload.type === "hint") setHint(payload.hint || "");
      if (payload.type === "fifty") setRemovedChoices(payload.removed || []);
      setQuestion(q => q ? { ...q, jokers: payload.jokers } : q);
    });
    socket.on("game_finished", (payload) => { setResults(payload.results); setQuestion(null); setAccountHighscores(payload.accountHighscores || []); });

    fetch("http://localhost:3001/highscores").then(r => r.json()).then(setHighscores).catch(() => {});
    fetch("http://localhost:3001/account-highscores").then(r => r.json()).then(setAccountHighscores).catch(() => {});

    return () => {
      ["registered","profile_updated","online_count","invitation_received","lobby_update","highscores_updated","account_highscores_updated","game_question","round_result","joker_result","game_finished"]
        .forEach(ev => socket.off(ev));
    };
  }, []);

  React.useEffect(() => {
    if (!question?.roundEndsAt) return;
    const t = setInterval(() => setTimeLeftMs(Math.max(0, question.roundEndsAt - Date.now())), 100);
    return () => clearInterval(t);
  }, [question?.roundEndsAt]);

  React.useEffect(() => {
    if (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) {
      document.documentElement.style.height = "100%";
      document.body.style.height = "100%";
    }
  }, []);

  const register = () => socket.emit("register_user", { name });
  const addFriend = () => {
    if (!me || !friendId) return;
    socket.emit("add_friend", { userId: me.userId, friendUserId: friendId });
    setFriendId("");
  };
  const invitePlayers = () => {
    if (!me) return;
    const invitedUserIds = inviteIds.split(",").map(s => s.trim()).filter(Boolean);
    socket.emit("invite_players", { hostUserId: me.userId, invitedUserIds });
  };
  const respond = (response) => {
    if (!me || !invitation) return;
    socket.emit("respond_invitation", { userId: me.userId, lobbyId: invitation.lobbyId, response });
    setInvitation(null);
  };
  const submitAnswer = (answer) => {
    if (!me || !question) return;
    socket.emit("submit_answer", { userId: me.userId, lobbyId: question.lobbyId, answer });
  };
  const useJoker = (type) => {
    if (!me || !question) return;
    socket.emit("use_joker", { userId: me.userId, lobbyId: question.lobbyId, type });
  };

  const progress = question?.roundEndsAt ? Math.max(0, (timeLeftMs / 60000) * 100) : 0;

  return (
    <div style={styles.app}>
      <h1 style={{ fontSize: "clamp(1.8rem, 5vw, 2.8rem)" }}>Moos IQ Game Multiplayer 1.2</h1>
      <p>Online-Spieler: {onlineCount}</p>

      {!me ? (
        <div style={styles.card}>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Dein Name" style={styles.input} />
          <button onClick={register} style={styles.button}>Registrieren</button>
        </div>
      ) : (
        <>
          <div style={styles.card}>
            <h2>Profil</h2>
            <div>Name: {me.name}</div>
            <div>User-ID: {me.userId}</div>
          </div>

          <div style={styles.card}>
            <h2>Freunde</h2>
            <input value={friendId} onChange={e => setFriendId(e.target.value)} placeholder="Freund per User-ID hinzufügen" style={styles.input} />
            <button onClick={addFriend} style={styles.button}>Freund speichern</button>
            <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(friends, null, 2)}</pre>
          </div>

          <div style={styles.card}>
            <h2>Lobby und Einladungen</h2>
            <input value={inviteIds} onChange={e => setInviteIds(e.target.value)} placeholder="User-IDs, kommagetrennt" style={styles.input} />
            <button onClick={invitePlayers} style={styles.button}>Spieler einladen</button>
          </div>

          {invitation && (
            <div style={styles.card}>
              <h2>Einladung erhalten</h2>
              <p>Von: {invitation.fromName}</p>
              <div style={styles.row}>
                <button onClick={() => respond("accept")} style={styles.button}>Akzeptieren</button>
                <button onClick={() => respond("decline")} style={{ ...styles.button, background: "#dc2626" }}>Ablehnen</button>
              </div>
            </div>
          )}

          {lobby && (
            <div style={styles.card}>
              <h2>Lobby-Status</h2>
              <div>Lobby-ID: {lobby.lobbyId}</div>
              <div>Status: {lobby.status}</div>
              <div>Akzeptiert: {lobby.acceptedUserIds?.length || 0}</div>
              <div>Verwendete Fragen in dieser Runde: {lobby.game?.usedQuestionIds?.length || 0}</div>
              <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(lobby.invited, null, 2)}</pre>
            </div>
          )}

          {question && (
            <div style={styles.card}>
              <h2>Spielrunde</h2>
              <div>Frage {question.questionIndex + 1} von {question.totalQuestions}</div>
              <div style={styles.timerOuter}>
                <div style={{ ...styles.timerInner, width: `${progress}%` }} />
              </div>
              <div style={{ marginBottom: 12 }}>{Math.ceil(timeLeftMs / 1000)} Sekunden</div>
              <div style={{ marginTop: 8, marginBottom: 12, fontWeight: 800 }}>{question.question.question}</div>

              <div style={{ ...styles.row, marginBottom: 12 }}>
                {question.jokers?.hint && <button onClick={() => useJoker("hint")} style={styles.secondaryButton}>Hinweis</button>}
                {question.jokers?.fifty && <button onClick={() => useJoker("fifty")} style={styles.secondaryButton}>50:50</button>}
                {question.jokers?.skip && <button onClick={() => useJoker("skip")} style={styles.secondaryButton}>Überspringen</button>}
              </div>

              {hint && <div style={{ marginBottom: 12, color: "#fde68a" }}>Hinweis: {hint}</div>}

              {question.question.choices.map((choice, i) => (
                <button
                  key={i}
                  onClick={() => submitAnswer(i)}
                  disabled={removedChoices.includes(i)}
                  style={{ ...styles.answer, opacity: removedChoices.includes(i) ? 0.4 : 1 }}
                >
                  {String.fromCharCode(65 + i)}. {choice}
                </button>
              ))}

              <div style={{ marginTop: 12 }}>
                <strong>Aktuelle Spielstände</strong>
                <div style={{ ...styles.row, marginTop: 8 }}>
                  {question.scoreboard.map(s => (
                    <div key={s.userId} style={styles.score}>
                      <div style={{ fontWeight: 800 }}>{s.name}</div>
                      <div>{s.moosDollar} Moos Dollar</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {roundResult && (
            <div style={styles.card}>
              <h2>Rundenergebnis</h2>
              <div>Richtige Antwort: {String.fromCharCode(65 + roundResult.correctAnswer)}</div>
            </div>
          )}

          {results && (
            <div style={styles.card}>
              <h2>Spiel beendet</h2>
              <div style={styles.row}>
                {results.map(r => (
                  <div key={r.userId} style={styles.score}>
                    <div style={{ fontWeight: 800 }}>{r.name}</div>
                    <div>{r.moosDollar} Moos Dollar</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={styles.card}>
            <h2>Spiel-Highscores</h2>
            <div style={styles.row}>
              {highscores.slice(0, 10).map((h, i) => (
                <div key={i} style={styles.score}>
                  <div style={{ fontWeight: 800 }}>{h.name}</div>
                  <div>{h.moosDollar} Moos Dollar</div>
                </div>
              ))}
            </div>
          </div>

          <div style={styles.card}>
            <h2>Konto-Highscores</h2>
            <div style={styles.row}>
              {accountHighscores.slice(0, 10).map((h, i) => (
                <div key={i} style={styles.score}>
                  <div style={{ fontWeight: 800 }}>{h.name}</div>
                  <div>{h.totalMoosDollar} gesamte Moos Dollar</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);