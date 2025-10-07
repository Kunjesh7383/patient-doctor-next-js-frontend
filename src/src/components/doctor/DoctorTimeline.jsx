// components/doctor/DoctorTimeline.jsx
import React from "react";

export function DoctorTimeline({
  timeline,
  onSendQuestion,
  onGenerateSuggestions,
  isGeneratingQuestions,
  highlightedMessageId,
  MessageItem,
  EventItem,
  hasExistingQuestions,
}) {
  if (timeline.length === 0) {
    return (
      <div className="empty-timeline">
        <div className="empty-icon">💬</div>
        <p>Start a conversation with your patient</p>
      </div>
    );
  }

  return (
    <div className="timeline-content">
      {timeline.map((item, index) => {
        const isMessageHighlighted =
          highlightedMessageId &&
          (item.data.message_id === highlightedMessageId ||
            item.data.id === highlightedMessageId);
        const hasEvents = item.events.length > 0;

        return (
          <div
            key={item.data.message_id || index}
            className={`timeline-row ${hasEvents ? "has-events" : ""}`}
            data-message-index={item.index}
          >
            {/* ✅ LEFT SIDE: Events (Questions) */}
            <div className={`timeline-left ${hasEvents ? "" : "no-events"}`}>
              {hasEvents ? (
                item.events.map((event, eventIndex) => (
                  <div key={event.id} className="event-wrapper">
                    <EventItem
                      event={event}
                      onSendQuestion={onSendQuestion}
                      messageIndex={item.index}
                    />
                    {/* Connecting line between events */}
                    {eventIndex < item.events.length - 1 && (
                      <div className="connecting-line"></div>
                    )}
                  </div>
                ))
              ) : (
                <div className="no-events">
                  <span className="no-events-text d-none">
                    No questions yet
                  </span>
                  {/* Generate button for patient messages without questions */}
                  {item.data.role === "user" && (
                    <button
                      className="generate-for-message-btn"
                      onClick={() => onGenerateSuggestions()}
                      disabled={
                        isGeneratingQuestions || hasExistingQuestions(item.data)
                      }
                      title={
                        hasExistingQuestions(item.data)
                          ? "Questions already generated for this message"
                          : "Generate questions for this message"
                      }
                    >
                      {hasExistingQuestions(item.data)
                        ? "✓ Questions Exist"
                        : "💡 Generate"}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* ✅ RIGHT SIDE: Message */}
            <div className="timeline-right">
              <MessageItem
                message={item.data}
                index={item.index}
                isConnected={hasEvents}
                analysis={item.analysis}
                isHighlighted={isMessageHighlighted}
                showAnalysis={true}
                isOwn={item.data.role === "doctor"}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
