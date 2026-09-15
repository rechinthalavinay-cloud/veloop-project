import { useEffect, useRef, useState } from "react";
import { games } from "../../data/gamesData";
import GameCard from "./GameCard";
import CarouselDots from "./CarouselDots";
import { ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./GamesCarousel.module.css";

export default function GamesCarousel() {
  const scrollerRef = useRef(null);
  const [active, setActive] = useState(0);
  const [ready, setReady] = useState(false);
  const [cardsToShow, setCardsToShow] = useState(4);

  // Update cards to show based on window width
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 600) setCardsToShow(1);
      else if (window.innerWidth <= 1024) setCardsToShow(2);
      else if (window.innerWidth <= 1280) setCardsToShow(3);
      else setCardsToShow(4);
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 100);
    return () => window.clearTimeout(timer);
  }, []);

  // Update active dot on scroll
  const handleScroll = () => {
    const node = scrollerRef.current;
    if (!node) return;
    const scrollPosition = node.scrollLeft;
    const cardWidth = node.scrollWidth / games.length;
    const newActive = Math.round(scrollPosition / cardWidth);
    if (newActive !== active && newActive >= 0 && newActive < games.length) {
      setActive(newActive);
    }
  };

  const jumpTo = (index) => {
    const node = scrollerRef.current;
    if (!node) return;
    const cardWidth = node.scrollWidth / games.length;
    node.scrollTo({
      left: index * cardWidth,
      behavior: "smooth",
    });
    setActive(index);
  };

  const scrollLeft = () => {
    const newActive = Math.max(0, active - 1);
    jumpTo(newActive);
  };

  const scrollRight = () => {
    // Prevent scrolling past the last complete view
    const maxIndex = games.length - cardsToShow;
    const newActive = Math.min(maxIndex, active + 1);
    jumpTo(newActive);
  };

  if (!ready) {
    return (
      <div className={styles.loader} role="status">
        <div className={styles.loaderSpinner}></div>
        <p>Loading catalog...</p>
      </div>
    );
  }

  return (
    <div className={styles.carouselContainer}>
      {/* Controls */}
      <div className={styles.controlsHeader}>
        <div className={styles.navControls}>
          <button 
            type="button" 
            className={styles.navBtn} 
            onClick={scrollLeft}
            disabled={active === 0}
            aria-label="Previous games"
          >
            <ChevronLeft size={20} />
          </button>
          <button 
            type="button" 
            className={styles.navBtn} 
            onClick={scrollRight}
            disabled={active >= games.length - cardsToShow}
            aria-label="Next games"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className={styles.scroller}
        onScroll={handleScroll}
      >
        {games.map((game) => (
          <div key={game.id} className={styles.cardWrapper}>
            <GameCard game={game} />
          </div>
        ))}
      </div>
      
      <div className={styles.paginationWrapper}>
        <CarouselDots 
          total={Math.max(1, games.length - cardsToShow + 1)} 
          active={Math.min(active, games.length - cardsToShow)} 
          onSelect={jumpTo} 
        />
      </div>
    </div>
  );
}
