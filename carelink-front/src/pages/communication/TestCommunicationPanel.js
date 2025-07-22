import React from 'react';

const TestCommunicationPanel = () => {
    console.log('[TestCommunicationPanel] This component is loading!');
    
    return (
        <div style={{ padding: '20px', background: 'lightblue', margin: '20px' }}>
            <h1>🎉 COMMUNICATION PANEL TEST</h1>
            <p>If you see this, the routing is working!</p>
            <p>Current URL: {window.location.pathname}</p>
        </div>
    );
};

export default TestCommunicationPanel;
