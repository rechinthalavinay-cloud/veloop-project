import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import "./BladeMaster.css";

const TOTAL_KNIVES = 8;
const GAME_TIME = 30;

const BASE_SCORE = 100;
const COMBO_BONUS = 25;

// Minimum angular distance between knives.
const COLLISION_ANGLE = 22;

const normalizeAngle = (angle) => {
  let value = angle % 360;

  if (value < 0) {
    value += 360;
  }

  return value;
};

const angleDifference = (a, b) => {
  let difference = Math.abs(
    normalizeAngle(a) -
      normalizeAngle(b)
  );

  if (difference > 180) {
    difference = 360 - difference;
  }

  return difference;
};

/* =========================================================
   KNIFE COMPONENT

   IMPORTANT:
   The TIP of the knife is exactly at Y = 0.

   Therefore:
   anchor = blade tip

   Everything else extends outward from the target.
   ========================================================= */

function Knife({
  className = "",
  style = {},
}) {
  return (
    <div
      className={`knife ${className}`}
      style={style}
    >
      <div className="knife-blade">
        <div className="blade-highlight" />
        <div className="blade-edge" />
      </div>

      <div className="knife-guard" />

      <div className="knife-handle">
        <span />
        <span />
        <span />
        <span />
      </div>

      <div className="knife-pommel" />
    </div>
  );
}

/* =========================================================
   MAIN GAME
   ========================================================= */

export default function BladeMaster({
  embedded = false,
  autoStart = false,
  onOutcome,
  reviveSignal = 0,
}) {
  const arenaRef = useRef(null);
  const targetRef = useRef(null);

  const rotationRef = useRef(0);

  const rotationFrameRef =
    useRef(null);

  const flightFrameRef =
    useRef(null);

  const [gameState, setGameState] =
    useState("start");

  const [score, setScore] =
    useState(0);

  const [timeLeft, setTimeLeft] =
    useState(GAME_TIME);

  const [knivesLeft, setKnivesLeft] =
    useState(TOTAL_KNIVES);

  const [combo, setCombo] =
    useState(0);

  const [bestCombo, setBestCombo] =
    useState(0);

  const [rotation, setRotation] =
    useState(0);

  /*
    Angles are stored in TARGET LOCAL
    coordinates.

    This means when the target rotates,
    the knives automatically rotate
    with it.
  */
  const [stuckKnives, setStuckKnives] =
    useState([]);

  const flyingAnchorRef = useRef(null);
  const isFlyingRef = useRef(false);

  const [particles, setParticles] =
    useState([]);

  const [showCombo, setShowCombo] =
    useState(false);

  const [shake, setShake] =
    useState(false);

  const [muted, setMuted] =
    useState(false);

  /* =======================================================
     TARGET GEOMETRY
     ======================================================= */

  const getTargetInfo = useCallback(() => {
    if (
      !arenaRef.current ||
      !targetRef.current
    ) {
      return null;
    }

    const arena =
      arenaRef.current.getBoundingClientRect();

    const target =
      targetRef.current.getBoundingClientRect();

    const centerX =
      target.left -
      arena.left +
      target.width / 2;

    const centerY =
      target.top -
      arena.top +
      target.height / 2;

    /*
      Blade tip is placed inside
      the wooden section.

      This is deliberately smaller
      than the outer radius.
    */
    const radius =
      target.width / 2 - 37;

    return {
      centerX,
      centerY,
      radius,
      size: target.width,
    };
  }, []);

  /* =======================================================
     TARGET ROTATION
     ======================================================= */

  useEffect(() => {
    if (gameState !== "playing") {
      return;
    }

    let previousTime =
      performance.now();

    const animate = (currentTime) => {
      const delta =
        currentTime -
        previousTime;

      previousTime = currentTime;

      /*
        Dynamic rotation logic.
        Uses time to occasionally alter speed and direction
        for a much more challenging and professional game loop.
      */
      const baseSpeed = 0.055;
      const phase = (currentTime / 1800) % (Math.PI * 2);
      const speedMultiplier = Math.sin(phase) + Math.sin(phase * 1.5) * 0.5;
      const speed = baseSpeed * speedMultiplier;

      rotationRef.current =
        normalizeAngle(
          rotationRef.current +
            delta * speed
        );

      if (targetRef.current) {
        targetRef.current.style.transform = `translate(-50%, -50%) rotate(${rotationRef.current}deg)`;
      }

      rotationFrameRef.current =
        requestAnimationFrame(
          animate
        );
    };

    rotationFrameRef.current =
      requestAnimationFrame(
        animate
      );

    return () => {
      cancelAnimationFrame(
        rotationFrameRef.current
      );
    };
  }, [gameState]);

  /* =======================================================
     TIMER
     ======================================================= */

  useEffect(() => {
    if (gameState !== "playing") {
      return;
    }

    const timer =
      setInterval(() => {
        setTimeLeft(
          (previous) => {
            if (previous <= 1) {
              clearInterval(timer);

              setGameState(
                "gameover"
              );

              return 0;
            }

            return previous - 1;
          }
        );
      }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [gameState]);

  /* =======================================================
     PARTICLES
     ======================================================= */

  const createParticles = useCallback(
    (x, y) => {
      const newParticles =
        Array.from(
          {
            length: 16,
          },
          (_, index) => {
            const angle =
              Math.random() *
              Math.PI *
              2;

            const distance =
              12 +
              Math.random() * 40;

            return {
              id:
                Date.now() +
                index +
                Math.random(),

              x,
              y,

              dx:
                Math.cos(angle) *
                distance,

              dy:
                Math.sin(angle) *
                distance,

              size:
                2 +
                Math.random() * 3,
            };
          }
        );

      setParticles(
        newParticles
      );

      setTimeout(() => {
        setParticles([]);
      }, 600);
    },
    []
  );

  /* =======================================================
     FINISH THROW
     ======================================================= */

  const finishThrow = useCallback(
    (
      knifeId,
      localAngle,
      impactX,
      impactY
    ) => {
      if (flyingAnchorRef.current) {
        flyingAnchorRef.current.style.display = "none";
      }
      isFlyingRef.current = false;

      /*
        Check whether the new knife
        is too close to another knife.
      */
      const collision =
        stuckKnives.some(
          (knife) =>
            angleDifference(
              knife.angle,
              localAngle
            ) < COLLISION_ANGLE
        );

      /* ===================================================
         COLLISION
         =================================================== */

      if (collision) {
        setCombo(0);

        setShake(true);

        createParticles(
          impactX,
          impactY
        );

        setTimeout(() => {
          setShake(false);
        }, 250);

        if (knivesLeft <= 1) {
          setTimeout(() => {
            setGameState(
              "gameover"
            );
          }, 500);
        }

        return;
      }

      /* ===================================================
         SUCCESS
         =================================================== */

      const newCombo =
        combo + 1;

      const bonus =
        Math.max(
          0,
          newCombo - 1
        ) * COMBO_BONUS;

      setScore(
        (previous) =>
          previous +
          BASE_SCORE +
          bonus
      );

      setCombo(newCombo);

      setBestCombo(
        (previous) =>
          Math.max(
            previous,
            newCombo
          )
      );

      setShowCombo(true);

      setShake(true);

      createParticles(
        impactX,
        impactY
      );

      setTimeout(() => {
        setShowCombo(false);
      }, 700);

      setTimeout(() => {
        setShake(false);
      }, 220);

      /*
        Store LOCAL target angle.

        The knife is a child of the
        rotating target, so it follows
        the target rotation naturally.
      */
      setStuckKnives(
        (previous) => [
          ...previous,
          {
            id: knifeId,
            angle: localAngle,
          },
        ]
      );

      if (knivesLeft <= 1) {
        setTimeout(() => {
          setGameState(
            "complete"
          );
        }, 700);
      }
    },
    [
      combo,
      createParticles,
      knivesLeft,
      stuckKnives,
    ]
  );

  /* =======================================================
     THROW KNIFE
     ======================================================= */

  const throwKnife = useCallback(() => {
    if (gameState !== "playing") {
      return;
    }

    if (isFlyingRef.current) {
      return;
    }

    if (knivesLeft <= 0) {
      return;
    }

    const target =
      getTargetInfo();

    if (!target) {
      return;
    }

    /*
      The throw comes from the bottom.

      In screen coordinates:
      0   = right
      90  = bottom
      180 = left
      270 = top

      Convert current world angle
      to target-local angle.
    */


    /*
      Exact blade-tip impact point.
    */
    const impactX =
      target.centerX;

    const impactY =
      target.centerY +
      target.radius;

    /*
      Start below the target.
    */
    const startX =
      target.centerX;

    const startY =
      Math.min(
        arenaRef.current.clientHeight -
          85,
        target.centerY +
          target.radius +
          190
      );

    const duration = 120; // Snappier throw speed

    const startTime =
      performance.now();

    const knifeId =
      Date.now() +
      Math.random();

    setKnivesLeft(
      (previous) =>
        previous - 1
    );

    if (flyingAnchorRef.current) {
      flyingAnchorRef.current.style.display = "block";
      flyingAnchorRef.current.style.left = `${startX}px`;
      flyingAnchorRef.current.style.top = `${startY}px`;
    }
    isFlyingRef.current = true;

    const animate = (currentTime) => {
      const progress =
        Math.min(
          (currentTime -
            startTime) /
            duration,
          1
        );

      /*
        Stronger acceleration for a professional feel.
      */
      const eased =
        1 -
        Math.pow(
          1 - progress,
          4
        );

      const x =
        startX +
        (impactX -
          startX) *
          eased;

      const y =
        startY +
        (impactY -
          startY) *
          eased;

      if (flyingAnchorRef.current) {
        flyingAnchorRef.current.style.left = `${x}px`;
        flyingAnchorRef.current.style.top = `${y}px`;
      }

      if (progress < 1) {
        flightFrameRef.current =
          requestAnimationFrame(
            animate
          );
      } else {
        const finalAngle = normalizeAngle(90 - rotationRef.current);
        
        finishThrow(
          knifeId,
          finalAngle,
          impactX,
          impactY
        );
      }
    };

    flightFrameRef.current =
      requestAnimationFrame(
        animate
      );
  }, [
    finishThrow,
    flyingAnchorRef,
    gameState,
    getTargetInfo,
    knivesLeft,
  ]);

  /* =======================================================
     START GAME
     ======================================================= */

  const startGame = (keepScore = false) => {
    cancelAnimationFrame(
      flightFrameRef.current
    );

    rotationRef.current = 0;
    
    if (targetRef.current) {
      targetRef.current.style.transform = `translate(-50%, -50%) rotate(0deg)`;
    }

    if (!keepScore) {
      setScore(0);
    }

    setTimeLeft(
      GAME_TIME
    );

    setKnivesLeft(
      TOTAL_KNIVES
    );

    setCombo(0);

    setBestCombo(0);

    setStuckKnives([]);

    if (flyingAnchorRef.current) {
      flyingAnchorRef.current.style.display = "none";
    }
    isFlyingRef.current = false;

    setParticles([]);

    setShowCombo(false);

    setGameState(
      "playing"
    );
  };

  useEffect(() => {
    if (autoStart) {
      startGame();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  useEffect(() => {
    if (!reviveSignal) return;
    startGame(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviveSignal]);

  useEffect(() => {
    if (!embedded || !onOutcome) return;
    if (gameState === "gameover") {
      onOutcome({ type: "over", score });
    }
    if (gameState === "complete") {
      onOutcome({ type: "complete", score });
    }
  }, [embedded, gameState, onOutcome, score]);

  /* =======================================================
     KEYBOARD
     ======================================================= */

  useEffect(() => {
    const handleKeyDown = (
      event
    ) => {
      if (
        event.code ===
          "Space" &&
        gameState ===
          "playing"
      ) {
        event.preventDefault();

        throwKnife();
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [
    gameState,
    throwKnife,
  ]);

  /* =======================================================
     CLEANUP
     ======================================================= */

  useEffect(() => {
    return () => {
      cancelAnimationFrame(
        rotationFrameRef.current
      );

      cancelAnimationFrame(
        flightFrameRef.current
      );
    };
  }, []);

  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <div className={`blade-master ${embedded ? "embedded" : ""}`}>

      {/* ===================================================
          BACKGROUND
          =================================================== */}

      <div className="game-background">
        <div className="background-glow" />

        <div className="mountain mountain-left" />

        <div className="mountain mountain-right" />

        {Array.from(
          {
            length: 14,
          },
          (_, index) => (
            <span
              key={index}
              className="ember"
              style={{
                left:
                  `${Math.random() * 100}%`,
                animationDelay:
                  `${Math.random() * 5}s`,
              }}
            />
          )
        )}
      </div>

      {!embedded && (
      <header className="bm-nav">

        <button
          className="back-button"
          onClick={() =>
            window.history.back()
          }
        >
          ← Back to Games
        </button>

        <div className="veloop-logo">
          VELOOP
          <span>GAMES</span>
        </div>

        <div className="nav-actions">

          <button
            onClick={() =>
              setMuted(
                (previous) =>
                  !previous
              )
            }
            aria-label="Sound"
          >
            {muted
              ? "🔇"
              : "🔊"}
          </button>

          <button
            onClick={() => {
              if (
                document.documentElement
                  .requestFullscreen
              ) {
                document.documentElement.requestFullscreen();
              }
            }}
            aria-label="Fullscreen"
          >
            ⛶
          </button>

          <button
            aria-label="Settings"
          >
            ⚙
          </button>

        </div>

      </header>
      )}

      {/* ===================================================
          GAME LAYOUT
          =================================================== */}

      <main className="game-layout">

        {/* =================================================
            LEFT SIDE
            ================================================= */}

        <aside className="left-sidebar">

          <div className="brand-panel">

            <div className="crown">
              ♛
            </div>

            <div className="gold-divider">
              <span />
              ◆
              <span />
            </div>

            <h1>
              BLADE
              <strong>
                MASTER
              </strong>
            </h1>

            <p>
              PRECISION • TIMING • MASTERY
            </p>

          </div>

          <div className="instruction-panel">

            <div className="instruction-target">
              ◎
            </div>

            <p>
              Time your throws
              carefully.
              <br />
              Every blade must
              stick without
              touching another.
            </p>

          </div>

        </aside>

        {/* =================================================
            CENTER GAME
            ================================================= */}

        <section
          ref={arenaRef}
          className={`game-arena ${
            shake
              ? "game-shake"
              : ""
          }`}
        >

          {/* HUD */}

          <div className="hud">

            <div className="hud-box">
              <small>
                SCORE
              </small>

              <strong>
                {score}
              </strong>
            </div>

            <div className="hud-box">
              <small>
                TIME
              </small>

              <strong>
                {timeLeft}s
              </strong>
            </div>

            <div className="hud-box">
              <small>
                COMBO
              </small>

              <strong>
                x{combo}
              </strong>
            </div>

          </div>

          {/* TARGET */}

          <div
            ref={targetRef}
            className="target-wheel"
            style={{
              transform:
                `translate(-50%, -50%) rotate(0deg)`,
            }}
          >

            {/* Target shadow */}

            <div className="target-shadow" />

            {/* Wood */}

            <div className={`wood-target ${shake ? "target-hit" : ""}`}>

              <div className="wood-texture" />

              <div className="wood-grain grain-one" />
              <div className="wood-grain grain-two" />
              <div className="wood-grain grain-three" />

              <div className="wood-rings">

                <span />
                <span />
                <span />
                <span />
                <span />
                <span />

              </div>

              {/* Bullseye */}

              <div className="bullseye">

                <div className="bull-outer" />

                <div className="bull-middle" />

                <div className="bull-inner" />

                <div className="bull-center">
                  <span />
                </div>

              </div>

            </div>

            {/* Metal rim */}

            <div className="metal-rim">

              {Array.from(
                {
                  length: 16,
                },
                (_, index) => (
                  <span
                    key={index}
                    style={{
                      transform:
                        `rotate(${index * 22.5}deg) translateY(-50%)`,
                    }}
                  />
                )
              )}

            </div>

            {/* =================================================
                STUCK KNIVES
                ================================================= */}

            {stuckKnives.map(
              (knife) => {
                const target =
                  getTargetInfo();

                if (!target) {
                  return null;
                }

                /*
                  Convert radius to
                  percentage of target.
                */
                const distance =
                  target.radius;

                const x =
                  50 +
                  (Math.cos(
                    (knife.angle *
                      Math.PI) /
                      180
                  ) *
                    distance /
                    target.size) *
                    100;

                const y =
                  50 +
                  (Math.sin(
                    (knife.angle *
                      Math.PI) /
                      180
                  ) *
                    distance /
                    target.size) *
                    100;

                /*
                  Knife's natural direction
                  is DOWN (+Y).

                  We want it pointing OUTWARD
                  from the center.

                  Therefore:
                  rotation = angle - 90
                */
                const knifeRotation =
                  knife.angle - 90;

                return (
                  <div
                    key={knife.id}
                    className="knife-anchor"
                    style={{
                      left:
                        `${x}%`,
                      top:
                        `${y}%`,
                    }}
                  >

                    <Knife
                      className="stuck-knife"
                      style={{
                        transform:
                          `translateX(-50%) rotate(${knifeRotation}deg)`,
                      }}
                    />

                  </div>
                );
              }
            )}

          </div>

          {/* =================================================
              PARTICLES
              ================================================= */}

          <div className="particle-layer">

            {particles.map(
              (particle) => (
                <span
                  key={particle.id}
                  className="impact-particle"
                  style={{
                    left:
                      `${particle.x}px`,
                    top:
                      `${particle.y}px`,
                    "--dx":
                      `${particle.dx}px`,
                    "--dy":
                      `${particle.dy}px`,
                    width:
                      `${particle.size}px`,
                    height:
                      `${particle.size}px`,
                  }}
                />
              )
            )}

          </div>

          {/* =================================================
              FLYING KNIFE
              ================================================= */}

            <div
              ref={flyingAnchorRef}
              className="flying-anchor"
              style={{
                display: "none",
                position: "absolute",
              }}
            >

              <Knife
                className="flying-knife"
                style={{
                  /*
                    Knife naturally points DOWN.

                    Rotate 180° so the blade
                    points UP toward the target.
                  */
                  transform:
                    "translateX(-50%) rotate(180deg)",
                }}
              />

            </div>

          {/* =================================================
              THROW AREA
              ================================================= */}

          <div className="throw-zone">

            <div className="aim-guide">

              <div className="aim-circle" />

              <div className="aim-arrow">
                ↑
              </div>

            </div>

            {/* Ready knife */}

            <div className="ready-knife">

              <Knife />

            </div>

            {/* Throw button */}

            <button
              className="throw-button"
              onClick={
                throwKnife
              }
              disabled={
                gameState !==
                  "playing" ||
                knivesLeft <= 0
              }
            >

              <span>
                ◉
              </span>

              CLICK TO THROW

            </button>

            <div className="space-text">
              Press
              <b>
                SPACE
              </b>
              to throw
            </div>

          </div>

          {/* COMBO */}

          {showCombo && (
            <div className="combo-popup">
              COMBO x{combo}
            </div>
          )}

        </section>

        {/* =================================================
            RIGHT SIDE
            ================================================= */}

        <aside className="right-sidebar">

          <div className="blades-panel">

            <h3>
              BLADES LEFT
            </h3>

            <div className="mini-knives">

              {Array.from(
                {
                  length:
                    TOTAL_KNIVES,
                },
                (_, index) => (
                  <div
                    key={index}
                    className={
                      index <
                      knivesLeft
                        ? "mini-knife"
                        : "mini-knife disabled"
                    }
                  >

                    <Knife />

                  </div>
                )
              )}

            </div>

            <div className="blade-number">

              {knivesLeft}

              <span>
                /{TOTAL_KNIVES}
              </span>

            </div>

          </div>

          <div className="quote-panel">

            <div className="quote">
              “
            </div>

            <p>
              Good timing
              <br />
              creates legends.
            </p>

          </div>

        </aside>

      </main>

      {/* ===================================================
          START SCREEN
          =================================================== */}

      {!embedded && gameState === "start" && (
        <div className="overlay">

          <div className="modal">

            <div className="modal-crown">
              ♛
            </div>

            <small>
              VELOOP ARCADE
            </small>

            <h2>
              BLADE
              <span>
                MASTER
              </span>
            </h2>

            <p>
              Master the timing.
              Stick every blade.
              Build your combo.
            </p>

            <div className="modal-info">

              <div>
                <strong>
                  8
                </strong>
                <span>
                  BLADES
                </span>
              </div>

              <div>
                <strong>
                  30s
                </strong>
                <span>
                  TIME
                </span>
              </div>

              <div>
                <strong>
                  100+
                </strong>
                <span>
                  POINTS
                </span>
              </div>

            </div>

            <button
              className="start-button"
              onClick={
                startGame
              }
            >
              START GAME

              <span>
                →
              </span>
            </button>

          </div>

        </div>
      )}

      {/* ===================================================
          COMPLETE
          =================================================== */}

      {!embedded && gameState === "complete" && (
        <div className="overlay">

          <div className="modal result">

            <div className="result-icon">
              ✓
            </div>

            <small>
              ROUND COMPLETE
            </small>

            <h2>
              BLADE MASTERED
            </h2>

            <div className="final-score">
              {score}
            </div>

            <div className="final-label">
              FINAL SCORE
            </div>

            <div className="result-info">

              <div>
                <strong>
                  x{bestCombo}
                </strong>

                <span>
                  BEST COMBO
                </span>
              </div>

              <div>
                <strong>
                  {TOTAL_KNIVES - knivesLeft}
                </strong>

                <span>
                  HITS
                </span>
              </div>

            </div>

            <button
              className="start-button"
              onClick={
                startGame
              }
            >
              PLAY AGAIN
              <span>
                →
              </span>
            </button>

          </div>

        </div>
      )}

      {/* ===================================================
          GAME OVER
          =================================================== */}

      {!embedded && gameState === "gameover" && (
        <div className="overlay">

          <div className="modal result">

            <div className="result-icon fail">
              ×
            </div>

            <small>
              ROUND OVER
            </small>

            <h2>
              GAME OVER
            </h2>

            <div className="final-score">
              {score}
            </div>

            <div className="final-label">
              FINAL SCORE
            </div>

            <button
              className="start-button"
              onClick={
                startGame
              }
            >
              TRY AGAIN
              <span>
                →
              </span>
            </button>

          </div>

        </div>
      )}

    </div>
  );
}