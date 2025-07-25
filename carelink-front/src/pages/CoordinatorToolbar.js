import React, { useEffect, useState } from 'react';
// CSS is now handled by UnifiedBaseLayout.css

const CoordinatorToolbar = () => {
  const [toolbarData, setToolbarData] = useState(null);

  useEffect(() => {
    fetch('/coordinator/toolbar')
      .then((response) => response.json())
      .then((data) => setToolbarData(data))
      .catch((error) => console.error('Error fetching toolbar data:', error));
  }, []);

  if (!toolbarData) {
    return <div>Loading...</div>;
  }

  return (
    <div className="coordinator-toolbar">
      <nav className="menu">
        {toolbarData.menu.map((item, index) => (
          <a key={index} href={item.url} className="menu-item">
            {item.name}
          </a>
        ))}
      </nav>
      <div className="actions">
        {toolbarData.actions.map((action, index) => (
          <button key={index} onClick={() => window.location.href = action.url} className="action-button">
            {action.name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default CoordinatorToolbar;
