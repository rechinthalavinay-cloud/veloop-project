import { useParams, Link } from 'react-router-dom'
import './GamePage.css'

function GamePage() {
  const { gameName } = useParams()

  const title = gameName
    ?.split('-')
    .map(
      word => word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join(' ')

  return (
    <div className="game-page">

      <Link to="/" className="back-btn">
        ← Back to Games
      </Link>

      <div className="game-container">

        <span className="section-label">
          NOW PLAYING
        </span>

        <h1>{title}</h1>

        <p>
          Get ready to play, complete challenges and earn rewards!
        </p>

        <div className="game-placeholder">

          <div className="game-icon">
            🎮
          </div>

          <h2>{title}</h2>

          <p>
            Game coming soon...
          </p>

          <Link
            to={`/games/${gameName}/play`}
            className="primary-btn"
          >
            Start Game
          </Link>

        </div>

      </div>

    </div>
  )
}

export default GamePage