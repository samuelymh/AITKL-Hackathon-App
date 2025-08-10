# Floating AI Chat System

A reusable, floating AI chat widget that can be triggered from anywhere in your healthcare application.

## Components

### 1. FloatingAIChat
The main floating chat widget with a modern UI design.

### 2. ChatTriggerButton
A button component that can trigger the floating chat with specific session types.

### 3. GlobalFloatingChat
The global chat component that should be included in your app layout.

### 4. useFloatingChat Hook
React hook for managing the floating chat state across your application.

## Usage

### Basic Setup (Already Done)

The floating chat is already set up in your app layout:

```tsx
// app/layout.tsx
<FloatingChatProvider>
  {children}
  <GlobalFloatingChat />
</FloatingChatProvider>
```

### Using Chat Trigger Buttons

```tsx
import ChatTriggerButton from '@/components/ai/ChatTriggerButton';

// Basic usage
<ChatTriggerButton>
  Ask AI Assistant
</ChatTriggerButton>

// With specific session type
<ChatTriggerButton sessionType="consultation_prep">
  Prepare for Doctor Visit
</ChatTriggerButton>

// With custom styling
<ChatTriggerButton 
  sessionType="emergency_triage"
  variant="outline"
  className="text-red-600 border-red-200"
>
  Emergency Guidance
</ChatTriggerButton>
```

### Using the Hook Directly

```tsx
import { useFloatingChat } from '@/hooks/useFloatingChat';

function MyComponent() {
  const { showChat, hideChat, isVisible } = useFloatingChat();

  const handleEmergencyClick = () => {
    showChat('emergency_triage');
  };

  const handleGeneralChat = () => {
    showChat('general');
  };

  return (
    <div>
      <button onClick={handleEmergencyClick}>
        Emergency Help
      </button>
      <button onClick={handleGeneralChat}>
        General Questions
      </button>
    </div>
  );
}
```

## Session Types

- **general**: General health questions and support
- **consultation_prep**: Help preparing for doctor visits
- **clinical_support**: Clinical decision support for healthcare providers
- **medication_education**: Medication information and education
- **emergency_triage**: Emergency situation guidance

## Features

- **Floating Design**: Stays accessible from any page
- **Role-Based Responses**: Different AI behavior based on user role
- **Emergency Detection**: Automatic detection of emergency situations
- **Minimizable**: Can be minimized while keeping chat history
- **Responsive**: Works on desktop and mobile devices
- **Context Aware**: Maintains conversation history
- **Multiple Positions**: Can be positioned in any corner
- **Connection Status**: Shows online/offline status

## Customization

### Position
```tsx
<FloatingAIChat position="bottom-left" />
<FloatingAIChat position="top-right" />
```

### Default State
```tsx
<FloatingAIChat defaultOpen={true} />
```

### Custom Styling
The component uses Tailwind classes and can be customized via the `className` prop on ChatTriggerButton.

## Implementation in Your Dashboard

The dashboard now shows a beautiful AI Assistant card with different session type buttons instead of the embedded chat. This provides a cleaner interface while making the AI chat accessible as a floating widget.

## Benefits

1. **Space Efficient**: Doesn't take up dashboard real estate
2. **Always Accessible**: Available from any page in the app
3. **Context Preservation**: Chat history is maintained while navigating
4. **Better UX**: Modern floating design pattern
5. **Flexible**: Can be triggered with different session types
6. **Responsive**: Adapts to different screen sizes
