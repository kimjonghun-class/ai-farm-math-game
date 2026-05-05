import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const GAS_URL =
  "https://script.google.com/macros/s/AKfycbyAaDsX3MNBl133pOLqs-2PSZbkEZpzG1tKgZznPAaelVe2rjNbZH7l2wTjwLt_OJYgeA/exec";

const missions = [
  {
    title: "미션 1. 물 절약 식을 찾아라!",
    emoji: "💧",
    story:
      "AI 농장에서 일주일에 138L씩 32주 동안 물을 절약했어요. 농장 시스템을 깨우려면 알맞은 식을 찾아야 합니다.",
    question: "절약한 물의 양을 구하는 식은?",
    choices: ["138 × 32", "138 + 32", "138 × 3", "32 - 138"],
    answer: "138 × 32",
    code: "4",
    badge: "물방울 배지",
  },
  {
    title: "미션 2. AI 펌프를 작동시켜라!",
    emoji: "⚙️",
    story:
      "AI 펌프가 계산 결과를 기다리고 있어요. 정확한 곱을 입력해야 물길이 열립니다.",
    question: "138 × 32 = ?",
    choices: ["4416", "4216", "4146", "4516"],
    answer: "4416",
    code: "4",
    badge: "펌프 배지",
  },
  {
    title: "미션 3. 에너지 탱크를 채워라!",
    emoji: "🔋",
    story:
      "부분곱 6280과 1884가 흩어졌어요. 두 값을 합쳐 에너지 탱크를 충전하세요.",
    question: "6280 + 1884 = ?",
    choices: ["8164", "8044", "8064", "8264"],
    answer: "8164",
    code: "8",
    badge: "에너지 배지",
  },
  {
    title: "미션 4. 씨앗 로봇을 깨워라!",
    emoji: "🌰",
    story: "씨앗 로봇이 잠들었어요. 곱셈 암호를 풀면 다시 움직입니다.",
    question: "107 × 22 = ?",
    choices: ["2354", "2254", "2344", "2454"],
    answer: "2354",
    code: "2",
    badge: "씨앗 배지",
  },
  {
    title: "미션 5. 비교 게이트를 통과하라!",
    emoji: "🚪",
    story:
      "게이트가 두 계산 결과를 비교하라고 합니다. 더 큰 쪽을 찾아 문을 여세요.",
    question: "503×69 □ 611×56",
    choices: [">", "=", "<", "알 수 없음"],
    answer: ">",
    code: "1",
    badge: "게이트 배지",
  },
  {
    title: "미션 6. 우유 에너지를 충전하라!",
    emoji: "🥛",
    story:
      "도윤이가 하루에 350mL씩 25일 동안 마신 우유의 양을 구하면 마지막 에너지가 충전됩니다.",
    question: "350 × 25 = ?",
    choices: ["8750", "8500", "7750", "9250"],
    answer: "8750",
    code: "5",
    badge: "우유 배지",
  },
  {
    title: "최종 미션. 오류를 고쳐라!",
    emoji: "🚨",
    story:
      "친구가 230×14에서 230×10을 230으로 잘못 계산했어요. 올바르게 고쳐야 농장이 완전히 복구됩니다.",
    question: "230 × 14 = ?",
    choices: ["3220", "1150", "3020", "3120"],
    answer: "3220",
    code: "0",
    badge: "복구 배지",
  },
];

function shuffle(array) {
  return [...array].sort(() => Math.random() - 0.5);
}

function playSound(type) {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    if (type === "correct") {
      oscillator.frequency.value = 880;
    } else if (type === "wrong") {
      oscillator.frequency.value = 180;
    } else if (type === "start") {
      oscillator.frequency.value = 520;
    } else {
      oscillator.frequency.value = 660;
    }

    oscillator.type = "square";

    // 효과음 크게
    gainNode.gain.setValueAtTime(0.65, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.001,
      audioContext.currentTime + 0.28
    );

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.28);
  } catch (error) {
    console.log("효과음 재생 오류", error);
  }
}

async function saveToSheet(payload) {
  if (!GAS_URL) return;

  try {
    await fetch(GAS_URL, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.log("구글시트 저장 오류", error);
  }
}

export default function AiFarmMathMissionReact() {
  const [screen, setScreen] = useState("start");
  const [name, setName] = useState("");
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [life, setLife] = useState(3);
  const [codes, setCodes] = useState([]);
  const [badges, setBadges] = useState([]);
  const [selected, setSelected] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [combo, setCombo] = useState(0);
  const [saved, setSaved] = useState(false);

  const savedSecondsRef = useRef(0);

  const mission = missions[current];
  const progress = Math.round(((current + 1) / missions.length) * 100);

  const choices = useMemo(() => {
    return mission ? shuffle(mission.choices) : [];
  }, [current, mission]);

  useEffect(() => {
    if (screen !== "game") return;

    const timer = setInterval(() => {
      setSeconds((s) => {
        savedSecondsRef.current = s + 1;
        return s + 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [screen]);

  const startGame = () => {
    playSound("start");
    setScreen("game");
    setCurrent(0);
    setScore(0);
    setLife(3);
    setCodes([]);
    setBadges([]);
    setSelected(null);
    setFeedback("");
    setSeconds(0);
    savedSecondsRef.current = 0;
    setCombo(0);
    setSaved(false);
  };

  const finishGame = async (
    success,
    nextScore = score,
    nextLife = life,
    nextCodes = codes,
    nextBadges = badges
  ) => {
    playSound(success ? "correct" : "wrong");
    setScreen(success ? "success" : "fail");

    const payload = {
      name: name || "수학 탐험가",
      score: nextScore,
      life: nextLife,
      time: savedSecondsRef.current,
      success: success ? "성공" : "실패",
      code: nextCodes.join("-"),
      badges: nextBadges.join(" "),
      noteMission:
        "배움공책에 ① 계산 방법 ② 헷갈린 문제 ③ 조심할 점 정리하기",
    };

    await saveToSheet(payload);
    setSaved(true);
  };

  const chooseAnswer = (choice) => {
    if (selected) return;

    setSelected(choice);

    const isCorrect = choice === mission.answer;

    if (isCorrect) {
      playSound("correct");

      const nextCombo = combo + 1;
      const bonus = nextCombo >= 3 ? 5 : 0;
      const nextScore = score + 10 + bonus;
      const nextCodes = [...codes, mission.code];
      const nextBadges = [...badges, `${mission.emoji} ${mission.badge}`];

      setScore(nextScore);
      setCombo(nextCombo);
      setCodes(nextCodes);
      setBadges(nextBadges);
      setFeedback(bonus ? "정답! 콤보 보너스 +5점!" : "정답! 에너지 충전!");

      setTimeout(() => {
        setSelected(null);
        setFeedback("");

        if (current + 1 >= missions.length) {
          finishGame(true, nextScore, life, nextCodes, nextBadges);
        } else {
          setCurrent((c) => c + 1);
        }
      }, 650);
    } else {
      playSound("wrong");

      const nextLife = life - 1;

      setLife(nextLife);
      setCombo(0);
      setFeedback("오답! 생명 1개 감소. 자리 수를 다시 생각해 보세요.");

      setTimeout(() => {
        setSelected(null);
        setFeedback("");

        if (nextLife <= 0) {
          finishGame(false, score, nextLife, codes, badges);
        }
      }, 750);
    }
  };

  const reset = () => {
    startGame();
  };

  return (
    <div className="h-[100dvh] w-screen overflow-hidden bg-gradient-to-br from-emerald-200 via-sky-200 to-indigo-300 p-1 text-slate-800">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-lg opacity-35"
            initial={{
              y: "105vh",
              x: `${Math.random() * 100}vw`,
              rotate: 0,
            }}
            animate={{
              y: "-10vh",
              rotate: 360,
            }}
            transition={{
              duration: 10 + Math.random() * 10,
              repeat: Infinity,
              delay: Math.random() * 7,
            }}
          >
            {i % 3 === 0 ? "⭐" : i % 3 === 1 ? "🌱" : "✨"}
          </motion.div>
        ))}
      </div>

      <main className="relative mx-auto flex h-full max-w-7xl items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex h-full w-full flex-col overflow-hidden rounded-[1.2rem] border-[3px] border-white/80 bg-white/90 shadow-2xl backdrop-blur"
        >
          <section className="shrink-0 bg-gradient-to-r from-emerald-500 to-sky-500 px-3 py-2 text-white md:px-5 md:py-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h1 className="text-2xl font-black tracking-tight md:text-4xl">
                  🌱 AI 농장 대탈출
                </h1>
                <p className="mt-0.5 text-xs font-semibold opacity-95 md:text-base">
                  곱셈 미션 · 세 자리 수 × 몇십몇 · 왕곡초 4학년 2반
                </p>
              </div>

              <motion.div
                animate={{ rotate: [0, -6, 6, 0] }}
                transition={{ repeat: Infinity, duration: 2.4 }}
                className="text-4xl md:text-6xl"
              >
                🤖
              </motion.div>
            </div>
          </section>

          <section className="min-h-0 flex-1 overflow-hidden p-2 md:p-3">
            <AnimatePresence mode="wait">
              {screen === "start" && (
                <motion.div
                  key="start"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="grid h-full gap-3 md:grid-cols-[1.2fr_.8fr]"
                >
                  <div className="flex flex-col justify-center rounded-3xl bg-amber-50 p-4 shadow-lg ring-2 ring-amber-200">
                    <div className="mb-2 inline-flex w-fit items-center gap-2 rounded-full bg-red-100 px-3 py-1 text-sm font-black text-red-600">
                      <span>⚡</span>
                      긴급 상황 발생!
                    </div>

                    <h2 className="text-2xl font-black md:text-3xl">
                      AI 농장의 물 절약 시스템이 멈췄어요!
                    </h2>

                    <p className="mt-2 text-base leading-6 md:text-lg">
                      곱셈 미션을 해결하고 에너지 배지와 탈출 코드를 모아
                      농장을 복구하세요. 정답을 연속으로 맞히면 콤보 보너스도
                      받을 수 있습니다.
                    </p>

                    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="이름을 입력하세요"
                        className="min-h-11 flex-1 rounded-2xl border-2 border-sky-200 px-4 text-base font-bold outline-none focus:border-sky-500 md:text-lg"
                      />

                      <button
                        onClick={startGame}
                        className="min-h-11 rounded-2xl bg-yellow-400 px-6 text-base font-black text-yellow-950 shadow-[0_4px_0_#f08c00] active:translate-y-1 active:shadow-none md:text-lg"
                      >
                        미션 시작 🚀
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col justify-center rounded-3xl bg-slate-900 p-4 text-white shadow-lg">
                    <h3 className="flex items-center gap-2 text-2xl font-black">
                      <span>🏆</span>
                      게임 규칙
                    </h3>

                    <div className="mt-3 space-y-2 text-base leading-6 md:text-lg">
                      <p>❤️ 생명은 3개입니다.</p>
                      <p>⭐ 정답 1개당 10점입니다.</p>
                      <p>🔥 3연속 정답부터 콤보 보너스 +5점!</p>
                      <p>📘 끝나면 결과 화면을 캡처해 제출하세요.</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {screen === "game" && mission && (
                <motion.div
                  key="game"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex h-full flex-col overflow-hidden"
                >
                  <div className="grid shrink-0 grid-cols-4 gap-2">
                    <InfoCard
                      icon="👤"
                      label="탐험가"
                      value={name || "수학 탐험가"}
                    />
                    <InfoCard icon="⭐" label="점수" value={`${score}점`} />
                    <InfoCard
                      icon="❤️"
                      label="생명"
                      value={"❤".repeat(Math.max(life, 0)) || "0"}
                    />
                    <InfoCard icon="⏱️" label="시간" value={`${seconds}초`} />
                  </div>

                  <div className="mt-2 h-3 shrink-0 overflow-hidden rounded-full bg-slate-200">
                    <motion.div
                      className="h-full bg-gradient-to-r from-emerald-400 via-yellow-300 to-orange-400"
                      animate={{ width: `${progress}%` }}
                    />
                  </div>

                  <div className="mt-2 grid shrink-0 gap-2 md:grid-cols-[125px_1fr]">
                    <motion.div
                      animate={{ y: [0, -7, 0] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="hidden min-h-24 items-center justify-center rounded-3xl bg-gradient-to-br from-sky-100 to-emerald-100 text-6xl shadow-inner md:flex"
                    >
                      {mission.emoji}
                    </motion.div>

                    <div className="rounded-3xl bg-yellow-50 p-3 shadow ring-2 ring-yellow-200">
                      <div className="mb-1 inline-flex rounded-full bg-white px-3 py-0.5 text-xs font-black text-sky-700 shadow">
                        {current + 1} / {missions.length}
                      </div>

                      <h2 className="text-lg font-black md:text-2xl">
                        {mission.title}
                      </h2>

                      <p className="mt-1 text-sm leading-5 md:text-base md:leading-6">
                        {mission.story}
                      </p>
                    </div>
                  </div>

                  <motion.div
                    key={mission.question}
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="mt-2 min-h-0 flex-1 overflow-hidden rounded-3xl bg-white p-2 shadow-lg ring-2 ring-sky-100"
                  >
                    <div className="mb-2 text-lg font-black text-cyan-700 md:text-2xl">
                      {mission.question}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {choices.map((choice) => {
                        const isChosen = selected === choice;
                        const isCorrect = choice === mission.answer;

                        const style = selected
                          ? isChosen && isCorrect
                            ? "bg-emerald-200 ring-4 ring-emerald-400"
                            : isChosen
                            ? "bg-red-200 ring-4 ring-red-400"
                            : "bg-slate-100 opacity-70"
                          : "bg-sky-100 hover:bg-sky-200 hover:-translate-y-1";

                        return (
                          <button
                            key={choice}
                            disabled={!!selected}
                            onClick={() => chooseAnswer(choice)}
                            className={`min-h-10 rounded-2xl px-3 py-2 text-left text-lg font-black shadow-md transition md:min-h-11 md:text-xl ${style}`}
                          >
                            {choice}
                          </button>
                        );
                      })}
                    </div>

                    {feedback && (
                      <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="mt-2 rounded-2xl bg-slate-900 p-2 text-center text-sm font-black text-white md:text-base"
                      >
                        {feedback}
                      </motion.div>
                    )}
                  </motion.div>

                  <div className="mt-1 flex shrink-0 flex-wrap gap-1">
                    {badges.slice(-4).map((badge, i) => (
                      <span
                        key={i}
                        className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-black text-emerald-700 shadow-sm md:text-sm"
                      >
                        {badge}
                      </span>
                    ))}
                  </div>
                </motion.div>
              )}

              {(screen === "success" || screen === "fail") && (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex h-full flex-col justify-center rounded-3xl bg-white p-3 text-center shadow-xl ring-2 ring-sky-100"
                >
                  {screen === "success" ? (
                    <>
                      <motion.div
                        animate={{
                          rotate: [0, 8, -8, 0],
                          scale: [1, 1.1, 1],
                        }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="text-5xl md:text-6xl"
                      >
                        🏆
                      </motion.div>

                      <h2 className="mt-1 text-2xl font-black text-emerald-600 md:text-3xl">
                        AI 농장 복구 성공!
                      </h2>
                    </>
                  ) : (
                    <>
                      <div className="text-5xl md:text-6xl">😢</div>

                      <h2 className="mt-1 text-2xl font-black text-red-500 md:text-3xl">
                        농장 복구 실패!
                      </h2>
                    </>
                  )}

                  <div className="mx-auto mt-3 grid w-full max-w-3xl gap-2 md:grid-cols-3">
                    <ResultCard label="이름" value={name || "수학 탐험가"} />
                    <ResultCard label="점수" value={`${score}점`} />
                    <ResultCard label="시간" value={`${seconds}초`} />
                  </div>

                  <div className="mx-auto mt-3 w-full max-w-3xl rounded-3xl bg-slate-900 p-3 text-white">
                    <p className="text-sm font-bold text-slate-300">
                      탈출 코드
                    </p>

                    <p className="mt-1 text-2xl font-black tracking-[.25em] text-emerald-300 md:text-3xl">
                      {codes.join("-") || "없음"}
                    </p>
                  </div>

                  <div className="mx-auto mt-3 w-full max-w-3xl rounded-3xl bg-amber-50 p-3 text-left ring-2 ring-amber-200">
                    <h3 className="text-lg font-black md:text-xl">
                      📘 배움공책 정리 미션
                    </h3>

                    <ol className="mt-1 list-decimal space-y-0.5 pl-6 text-sm font-semibold leading-6 md:text-base">
                      <li>138×32를 세로셈으로 계산하는 방법 쓰기</li>
                      <li>오늘 틀렸거나 헷갈린 문제 1개 다시 풀기</li>
                      <li>세 자리 수 × 몇십몇 계산에서 조심할 점 쓰기</li>
                    </ol>

                    <p className="mt-1 font-black text-sky-700">
                      ✅ 이 결과 화면을 캡처해서 제출하세요.
                    </p>

                    <p className="mt-0.5 text-xs text-slate-500">
                      구글시트 저장 상태:{" "}
                      {saved ? "저장 요청 완료" : "저장 중"}
                    </p>
                  </div>

                  <button
                    onClick={reset}
                    className="mx-auto mt-3 inline-flex items-center gap-2 rounded-2xl bg-yellow-400 px-6 py-2 text-base font-black text-yellow-950 shadow-[0_4px_0_#f08c00] active:translate-y-1 active:shadow-none"
                  >
                    <span>🔄</span>
                    다시 도전하기
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </motion.div>
      </main>
    </div>
  );
}

function InfoCard({ icon, label, value }) {
  return (
    <div className="rounded-2xl bg-white p-1.5 text-center shadow ring-1 ring-slate-100 md:p-2">
      <div className="text-lg md:text-2xl">{icon}</div>
      <div className="mt-0.5 text-[10px] font-black text-slate-400 md:text-xs">
        {label}
      </div>
      <div className="mt-0.5 truncate text-sm font-black md:text-lg">
        {value}
      </div>
    </div>
  );
}

function ResultCard({ label, value }) {
  return (
    <div className="rounded-2xl bg-sky-50 p-2 shadow-sm ring-1 ring-sky-100 md:p-3">
      <p className="text-xs font-black text-sky-600 md:text-sm">{label}</p>
      <p className="mt-0.5 text-lg font-black md:text-xl">{value}</p>
    </div>
  );
}
