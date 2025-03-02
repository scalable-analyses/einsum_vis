import React, { useEffect } from 'react';
import './App.css';
import EinsumTreeVisualizer from './components/EinsumTreeVisualizer.jsx';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { decompressData } from './components/utils/compression.jsx';
import { getBaseUrl } from './components/utils/paths.jsx';

function App() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Get and decompress URL parameters
  const compressedExpression = searchParams.get('e');
  const compressedSizes = searchParams.get('s');

  const initialExpression = decompressData(compressedExpression);
  const initialSizes = decompressData(compressedSizes);

  // Clear URL parameters after reading them
  useEffect(() => {
    if (compressedExpression || compressedSizes) {
      // Small delay to ensure data is processed
      setTimeout(() => {
        navigate(getBaseUrl(), { replace: true });
      }, 100);
    }
  }, [compressedExpression, compressedSizes, navigate]);

  return (
    <div className="App">
      <header className="App-header">
        {/* Decorative particles */}
        <div className="tensor-particle"></div>
        <div className="tensor-particle"></div>
        <div className="tensor-particle"></div>
        <div className="tensor-particle"></div>
        <div className="tensor-particle"></div>

        <h1>Einsum Tree Visualizer</h1>
        <a
          href="https://github.com/SeriousSeal/tensor_expressions_webapp"
          target="_blank"
          rel="noopener noreferrer"
          className="github-link"
          aria-label="GitHub Profile"
        >
          <svg
            className="github-icon"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
        </a>
      </header>
      <main className="App-content">
        <EinsumTreeVisualizer
          initialExpression={initialExpression}
          initialSizes={initialSizes}
        />
      </main>
    </div>
  );
}

export default App;
