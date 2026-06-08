import React from 'react';
import TaskCard from './TaskCard';

export default function QueueBoard({ title, tasks, currentUser, onUpdate, onDelete, isGlobalQueue, users = [] }) {
  return (
    <div className="queue-board">
      <div className="queue-board-header">
        <h3>{title}</h3>
        <span className="queue-count">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="queue-visual">
        {tasks.length === 0 ? (
          <div className="empty-queue">
            <p>No tasks in queue</p>
          </div>
        ) : (
          <div className="queue-track">
            <div className="queue-arrow-label">FRONT</div>
            <div className="queue-items">
              {tasks.map((task, index) => (
                <div key={task._id} className="queue-item-wrapper">
                  <TaskCard
                    task={task}
                    index={index}
                    currentUser={currentUser}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                    isGlobalQueue={isGlobalQueue}
                    users={users}
                  />
                  {index < tasks.length - 1 && <div className="queue-connector">→</div>}
                </div>
              ))}
            </div>
            <div className="queue-arrow-label">BACK</div>
          </div>
        )}
      </div>
    </div>
  );
}
