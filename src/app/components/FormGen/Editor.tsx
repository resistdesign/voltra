import React, { FC, useEffect, useState } from 'react';
import AceEditor from 'react-ace';
import 'ace-builds/src-noconflict/mode-typescript';
import 'ace-builds/src-noconflict/theme-github'; // Light theme
import 'ace-builds/src-noconflict/theme-monokai'; // Dark theme

interface EditorProps {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
}

export const Editor: FC<EditorProps> = ({ value, onChange, readOnly = false }) => {
  const [theme, setTheme] = useState('github'); // Default to light theme
  const [bgColor, setBgColor] = useState('white'); // Default to light theme

  useEffect(() => {
    // Check the user's preference
    const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)');

    // Set the theme based on the preference
    setTheme(prefersDarkMode.matches ? 'monokai' : 'github');
    setBgColor(prefersDarkMode.matches ? '#222222' : 'white');

    // Add an event listener to update the theme if the preference changes
    const handleChange = (e: MediaQueryListEvent) => {
      setTheme(e.matches ? 'monokai' : 'github');
      setBgColor(e.matches ? '#222222' : 'white');
    };

    prefersDarkMode.addEventListener('change', handleChange);

    // Clean up the event listener on unmount
    return () => {
      prefersDarkMode.removeEventListener('change', handleChange);
    };
  }, []);

  return (
    <AceEditor
      mode="typescript"
      theme={theme}
      name="editor"
      value={value}
      onChange={readOnly ? undefined : onChange}
      fontSize={18}
      width="100%"
      height="100%"
      readOnly={readOnly}
      setOptions={{
        enableBasicAutocompletion: !readOnly,
        enableLiveAutocompletion: !readOnly,
        enableSnippets: !readOnly,
        showLineNumbers: true,
        tabSize: 2,
      }}
      style={{
        flex: '1 0 auto',
        width: 'auto',
        height: 'auto',
        backgroundColor: bgColor,
      }}
    />
  );
};
