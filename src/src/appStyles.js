// appStyles.js
export const appStyles = {
  display: "flex",
  flexDirection: "column",
  minHeight: "100vh",
  backgroundColor: "#fafbfc",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif",
  position: "relative",
};

export const headerStyles = {
  position: "sticky",
  top: 0,
  zIndex: 100,
  background:"#bface3",
  color: "white",
  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
  padding: "16px 24px",
  display: "flex",
  alignItems: "center",
  borderBottom: "1px solid rgba(255,255,255,0.1)",
};

export const menuButtonStyles = {
  background: "rgba(255,255,255,0.15)",
  border: "1px solid rgba(255,255,255,0.2)",
  borderRadius: "8px",
  fontSize: 18,
  cursor: "pointer",
  marginRight: 20,
  color: "white",
  padding: "8px 12px",
  transition: "all 0.2s ease",
  backdropFilter: "blur(10px)",
};

export const titleStyles = {
  margin: 0,
  fontSize: "24px",
  fontWeight: 600,
  letterSpacing: "-0.5px",
  flex: 1,
};

export const modeDropdownStyles = {
  background: "rgba(255,255,255,0.15)",
  border: "1px solid rgba(255,255,255,0.2)",
  borderRadius: "8px",
  color: "white",
  padding: "8px 12px",
  fontSize: "14px",
  cursor: "pointer",
  marginRight: "16px",
  backdropFilter: "blur(10px)",
  outline: "none",
  transition: "all 0.2s ease",
};

export const connectionIndicatorStyles = {
  display: "flex",
  alignItems: "center",
  background: "rgba(255,255,255,0.1)",
  borderRadius: "20px",
  padding: "6px 12px",
  backdropFilter: "blur(10px)",
};

// Function to get status dot styles based on connection status
export const statusDotStyles = (connectionStatus) => ({
  width: "8px",
  height: "8px",
  borderRadius: "50%",
  backgroundColor:
    connectionStatus === "connected"
      ? "#4ade80"
      : connectionStatus === "loading"
      ? "#fbbf24"
      : "#f87171",
  marginRight: "8px",
  boxShadow: `0 0 0 2px ${
    connectionStatus === "connected"
      ? "rgba(74, 222, 128, 0.3)"
      : connectionStatus === "loading"
      ? "rgba(251, 191, 36, 0.3)"
      : "rgba(248, 113, 113, 0.3)"
  }`,
});

export const statusTextStyles = {
  fontSize: "13px",
  fontWeight: 500,
  textShadow: "0 1px 2px rgba(0,0,0,0.1)",
};

export const welcomeScreenStyles = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
  padding: "40px 20px",
};

export const welcomeCardStyles = {
  background: "white",
  borderRadius: "16px",
  padding: "48px 40px",
  boxShadow:
    "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
  textAlign: "center",
  maxWidth: "500px",
  width: "100%",
};

export const mainContentStyles = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  backgroundColor: "#ffffff",
};

export const contentWrapperStyles = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  maxWidth: "1200px",
  margin: "0 auto",
  width: "100%",
  padding: "0 20px",
};

export const doctorPanelStyles = {
  background: "white",
  borderRadius: "12px",
  margin: "20px 0",
  boxShadow:
    "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
};

export const loadingStyles = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "40px 20px",
  background: "linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)",
  borderRadius: "12px",
  margin: "20px 0",
};

export const emptyStateStyles = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "60px 20px",
  background: "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)",
  borderRadius: "12px",
  margin: "20px 0",
  color: "#6c757d",
  textAlign: "center",
};

export const footerStyles = {
  textAlign: "center",
  padding: "16px 20px",
  fontSize: "13px",
  fontWeight: 500,
  color: "#ffffff",
  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  borderTop: "1px solid rgba(255,255,255,0.25)",
  boxShadow: "0 -3px 10px rgba(102, 126, 234, 0.15)", // Matching blue shadow
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexWrap: "wrap",
  gap: "12px",
  minHeight: "60px",
  letterSpacing: "0.3px", // Professional spacing
  transition: "all 0.2s ease",
};

export const liveTranscriptionDisplayStyles = {
  margin: "20px 0",
  padding: "16px 20px",
  background: "linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%)",
  border: "2px solid #ffd93d",
  borderRadius: "12px",
  boxShadow: "0 4px 12px rgba(255, 193, 7, 0.2)",
};

// Common animation styles
export const animationStyles = {
  pulse: {
    animation: "pulse 1.5s infinite",
  },
  spin: {
    animation: "spin 1s linear infinite",
  },
};

// CSS keyframes for animations
export const cssAnimations = `
  @keyframes pulse {
    0%, 100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.7;
      transform: scale(1.05);
    }
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;

// Theme colors
export const theme = {
  colors: {
    primary: "#667eea",
    secondary: "#764ba2",
    success: "#28a745",
    warning: "#ffc107",
    danger: "#dc3545",
    info: "#17a2b8",
    light: "#f8f9fa",
    dark: "#343a40",
    gray: "#6c757d",
  },
  gradients: {
    primary: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    success: "linear-gradient(135deg, #28a745 0%, #20c997 100%)",
    warning: "linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%)",
    info: "linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)",
    light: "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)",
  },
  shadows: {
    small: "0 2px 4px rgba(0, 0, 0, 0.1)",
    medium: "0 4px 12px rgba(0, 0, 0, 0.15)",
    large:
      "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
  },
};
