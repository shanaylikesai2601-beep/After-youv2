```javascript
import React from 'react';
import './StatusCard.css'; // Assuming a CSS file for styling

const StatusCard = ({ title, status, progress, timestamp, description }) => {
  return (
    <div className='status-card'>
      <h2>{title}</h2>
      <div className='status-badge'>{status}</div>
      <div className='progress-bar'>{progress}%</div>
      <span className='timestamp'>{timestamp}</span>
      {description && <p>{description}</p>}
    </div>
  );
};

export default StatusCard;
```