import { useEffect, useRef, useState } from "react";
import { games } from "../../data/gamesData";
import GameCard from "./GameCard";
import CarouselDots from "./CarouselDots";
import styles from "./GamesCarousel.module.css";

export default function GamesCarousel() {
  const scrollerRef = useRef(null);
  const pausedRef = useRef(false);
  const dragRef = useRef({ active: false, startX: 0, startLeft: 0 });
  const [active, setActive] = useState(0);
  const [ready, setReady] = useState(false);
  const looped = [...games, ...games];

  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 420);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const node = scrollerRef.current;
    if (!node || !ready) return undefined;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return undefined;

    let frame;
    const tick = () => {
      if (!pausedRef.current && !dragRef.current.active) {
        node.scrollLeft += 0.55;
        const half = node.scrollWidth / 2;
        if (node.scrollLeft >= half) {
          node.scrollLeft -= half;
        }
        const card = node.querySelector("[data-card]");
        const width = card ? card.getBoundingClientRect().width + 16 : 276;
        setActive(Math.round(node.scrollLeft / width) % games.length);
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [ready]);

  const pause = () => {
    pausedRef.current = true;
  };
  const resume = () => {
    pausedRef.current = false;
  };

  const jumpTo = (index) => {
    const node = scrollerRef.current;
    const card = node?.querySelector("[data-card]");
    if (!node || !card) return;
    node.scrollTo({
      left: index * (card.getBoundingClientRect().width + 16),
      behavior: "smooth",
    });
    setActive(index);
  };

  const onPointerDown = (event) => {
    const node = scrollerRef.current;
    if (!node) return;
    pause();
    dragRef.current = {
      active: true,
      startX: event.clientX,
      startLeft: node.scrollLeft,
      dragged: false
    };
  };

  const onClickCapture = (event) => {
    if (dragRef.current.dragged) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  const onPointerMove = (event) => {
    const node = scrollerRef.current;
    if (!node || !dragRef.current.active) return;
    const diff = Math.abs(event.clientX - dragRef.current.startX);
    if (diff > 5) {
      dragRef.current.dragged = true;
    }
    node.scrollLeft = dragRef.current.startLeft - (event.clientX - dragRef.current.startX);
  };

  const onPointerUp = () => {
    // delay resetting drag state slightly so click capture can use it
    setTimeout(() => {
      dragRef.current.active = false;
      dragRef.current.dragged = false;
    }, 0);
  };

  if (!ready) {
    return (
      <div className={styles.loader} role="status">
        <div className={styles.coin} />
        <strong>Loading Games...</strong>
        <p>Preparing your next reward challenge...</p>
      </div>
    );
  }

  return (
    <div>
      <div
        ref={scrollerRef}
        className={styles.scroller}
        onMouseEnter={pause}
        onMouseLeave={resume}
        onTouchStart={pause}
        onTouchEnd={resume}
        onWheel={pause}
        onClickCapture={onClickCapture}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {looped.map((game, index) => (
          <div key={`${game.id}-${index}`} data-card>
            <GameCard game={game} />
          </div>
        ))}
      </div>
      <CarouselDots total={games.length} active={active} onSelect={jumpTo} />
    </div>
  );
}
