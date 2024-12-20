import React, { useState, useEffect, useCallback } from 'react';

const VimGame = () => {
  // Game state
  const [currentText, setCurrentText] = useState('');
  const [targetText, setTargetText] = useState('');
  const [mode, setMode] = useState('normal'); // 'normal', 'insert', 'visual'
  const [score, setScore] = useState(0);
  const [timeStart, setTimeStart] = useState(null);
  const [currentChallenge, setCurrentChallenge] = useState(0);
  const [keyBuffer, setKeyBuffer] = useState('');
  const [message, setMessage] = useState('');
  const [cursor, setCursor] = useState({ line: 0, col: 0 });
  const [lastKeystrokes, setLastKeystrokes] = useState([]);

  // Sample challenges
  const challenges = [
    {
      initial: 'Hello world\nThis is the test\nFix me please',
      target: 'Hello world\nThis is the best\nFix me please',
      instruction: 'Change "test" to "best" on the second line using "cw"',
      hint: 'Position cursor on "test", press "cw", type "best", press ESC',
      parKeystrokes: 12,
      expectedCommand: 'cw',
      difficulty: 'easy'
    },
    {
      initial: 'One\nOne\nOne\nOne',
      target: 'Two\nTwo\nTwo\nTwo',
      instruction: 'Replace all instances of "One" with "Two" using :s command',
      hint: 'Type ":s/One/Two/g" or ":%s/One/Two/g"',
      parKeystrokes: 13,
      expectedCommand: ':s/',
      difficulty: 'medium'
    }
  ];

  // Initialize challenge
  useEffect(() => {
    if (currentChallenge < challenges.length) {
      setCurrentText(challenges[currentChallenge].initial);
      setTargetText(challenges[currentChallenge].target);
      setTimeStart(Date.now());
      setCursor({ line: 0, col: 0 });
    }
  }, [currentChallenge]);

  const handleKeyPress = useCallback((e) => {
    e.preventDefault();
    
    let newBuffer = keyBuffer;
    let newMode = mode;
    let newText = currentText;
    let newCursor = { ...cursor };
    
    // Update keystroke history
    setLastKeystrokes(prev => {
      const updated = [...prev, e.key];
      return updated.slice(-10);
    });

    // Handle mode changes
    if (e.key === 'Escape') {
      newMode = 'normal';
      newBuffer = '';
      setMessage('');
    } else if (mode === 'normal' && e.key === 'i') {
      newMode = 'insert';
      setMessage('-- INSERT --');
    } else if (mode === 'normal' && e.key === ':') {
      newMode = 'command';
      newBuffer = ':';
      setMessage('');
    }

    if (mode === 'command') {
      if (e.key === 'Enter') {
        const commandStr = newBuffer;
        console.log('Raw command buffer:', newBuffer);
        console.log('Command string type:', typeof commandStr);
        console.log('Command string length:', commandStr.length);
        console.log('Command string chars:', [...commandStr].map(c => `${c}:${c.charCodeAt(0)}`));
        
        // Add ":" if not present at start
        const fullCommand = commandStr.startsWith(':') ? commandStr : ':' + commandStr;
        console.log('Full command:', fullCommand);
        
        if (fullCommand.startsWith(':s/') || fullCommand.startsWith(':%s/')) {
          const parts = fullCommand.split('/');
          console.log('Command parts:', parts);
          
          if (parts.length >= 3) {
            const fromText = parts[1];
            const toText = parts[2];
            console.log('Replacing:', fromText, 'With:', toText);
            
            // Do the replacement
            newText = currentText.split('\n')
              .map(line => line.replaceAll(fromText, toText))
              .join('\n');
              
            setMessage(`Replaced all occurrences of "${fromText}" with "${toText}"`);
          } else {
            setMessage('Invalid substitute command format');
          }
        } else {
          console.log('Command not recognized. Full command was:', fullCommand);
          setMessage(`Unknown command: ${commandStr}`);
        }
        
        newMode = 'normal';
        newBuffer = '';
      } else if (e.key === 'Backspace') {
        newBuffer = newBuffer.slice(0, -1);
        if (newBuffer === '') {
          newMode = 'normal';
        }
      } else if (e.key.length === 1) {
        // In command mode, concatenate the key to the buffer
        newBuffer += e.key;
        console.log('Updated buffer:', newBuffer);
      }
    } else if (mode === 'normal') {
      if (e.key === 'h') newCursor.col = Math.max(0, cursor.col - 1);
      if (e.key === 'l') newCursor.col = Math.min(currentText.split('\n')[cursor.line].length - 1, cursor.col + 1);
      if (e.key === 'j') newCursor.line = Math.min(currentText.split('\n').length - 1, cursor.line + 1);
      if (e.key === 'k') newCursor.line = Math.max(0, cursor.line - 1);
      
      if (e.key === 'c') {
        newBuffer = 'c';
      } else if (e.key === 'w' && newBuffer === 'c') {
        const lines = newText.split('\n');
        const currentLine = lines[cursor.line];
        const restOfLine = currentLine.slice(cursor.col);
        const wordMatch = restOfLine.match(/^\w+\s*/);
        
        if (wordMatch) {
          lines[cursor.line] = 
            currentLine.slice(0, cursor.col) + 
            currentLine.slice(cursor.col + wordMatch[0].length);
          newText = lines.join('\n');
          newMode = 'insert';
          setMessage('-- INSERT --');
        }
        newBuffer = '';
      } else if (e.key !== 'Shift') {
        newBuffer = '';
      }
    } else if (mode === 'insert') {
      if (e.key.length === 1) {
        const lines = newText.split('\n');
        lines[cursor.line] = 
          lines[cursor.line].slice(0, cursor.col) + 
          e.key + 
          lines[cursor.line].slice(cursor.col);
        newText = lines.join('\n');
        newCursor.col++;
      } else if (e.key === 'Backspace') {
        if (cursor.col > 0) {
          const lines = newText.split('\n');
          lines[cursor.line] = 
            lines[cursor.line].slice(0, cursor.col - 1) + 
            lines[cursor.line].slice(cursor.col);
          newText = lines.join('\n');
          newCursor.col--;
        }
      }
    }

    setKeyBuffer(newBuffer);
    setMode(newMode);
    setCurrentText(newText);
    setCursor(newCursor);

    if (newText === targetText) {
      const timeTaken = (Date.now() - timeStart) / 1000;
      const keystrokeCount = lastKeystrokes.length;
      
      let pointsEarned = Math.max(100 - Math.floor(timeTaken) * 2, 10);
      
      const expectedKeystrokes = challenges[currentChallenge].parKeystrokes || 10;
      const efficiencyBonus = keystrokeCount <= expectedKeystrokes ? 50 : 
                             keystrokeCount <= expectedKeystrokes * 1.5 ? 25 : 0;
      
      const usedCorrectCommand = challenges[currentChallenge].expectedCommand &&
                                lastKeystrokes.join('').includes(challenges[currentChallenge].expectedCommand);
      const commandBonus = usedCorrectCommand ? 25 : 0;
      
      const totalPoints = pointsEarned + efficiencyBonus + commandBonus;
      
      setScore(score + totalPoints);
      setMessage(
        `Challenge completed! \n` +
        `Base Score: ${pointsEarned} \n` +
        `Efficiency Bonus: +${efficiencyBonus} \n` +
        `Command Bonus: +${commandBonus} \n` +
        `Total: +${totalPoints} points`
      );
      
      setTimeout(() => {
        if (currentChallenge + 1 < challenges.length) {
          setMessage('Get ready for next challenge...');
          setTimeout(() => {
            setCurrentChallenge(currentChallenge + 1);
            setMessage('');
            setLastKeystrokes([]);
            setKeyBuffer('');
            setMode('normal');
          }, 1500);
        } else {
          setMessage('Game Complete! Final Score: ' + (score + totalPoints));
        }
      }, 3000);
    }
  }, [mode, keyBuffer, currentText, targetText, timeStart, score, currentChallenge, cursor, lastKeystrokes]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  const renderTextWithCursor = (text) => {
    const lines = text.split('\n');
    return lines.map((line, lineIndex) => (
      <div key={lineIndex} className="font-mono">
        {lineIndex === cursor.line ? (
          <>
            {line.slice(0, cursor.col)}
            <span className="bg-blue-500 text-white">{line[cursor.col] || ' '}</span>
            {line.slice(cursor.col + 1)}
          </>
        ) : line}
      </div>
    ));
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <div className="bg-slate-900 rounded-lg shadow-lg mb-4">
        <div className="p-6 text-white">
          <div className="mb-4">
            <h2 className="text-2xl font-bold mb-2">Vim Learning Game</h2>
            <div className="flex items-center gap-4">
              <p className="text-lg">Score: {score}</p>
              <p className="px-3 py-1 bg-slate-800 rounded text-sm">
                {mode.toUpperCase()} MODE {keyBuffer && `(Buffer: ${keyBuffer})`}
              </p>
            </div>
            {message && (
              <p className="text-sm text-blue-400 mt-1">{message}</p>
            )}
          </div>
          
          {currentChallenge < challenges.length ? (
            <>
              <div className="mb-4">
                <h3 className="font-bold mb-2">Challenge {currentChallenge + 1}:</h3>
                <p>{challenges[currentChallenge].instruction}</p>
                <p className="text-sm text-gray-400 mt-1">Hint: {challenges[currentChallenge].hint}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="border border-slate-700 rounded p-4">
                  <h4 className="font-bold mb-2">Your Text:</h4>
                  <div className="bg-slate-800 p-2 rounded">
                    {renderTextWithCursor(currentText)}
                  </div>
                </div>
                <div className="border border-slate-700 rounded p-4">
                  <h4 className="font-bold mb-2">Target Text:</h4>
                  <div className="bg-slate-800 p-2 rounded">
                    <pre className="font-mono whitespace-pre-wrap">{targetText}</pre>
                  </div>
                </div>
              </div>

              {mode === 'command' && (
                <div className="bg-slate-800 p-2 rounded mb-4 font-mono">
                  {keyBuffer}
                </div>
              )}

              <div className="bg-slate-800 p-4 rounded">
                <h4 className="font-bold mb-2">Debug Info:</h4>
                <div className="font-mono text-sm text-gray-300">
                  <p>Mode: <span className="text-yellow-400">{mode}</span></p>
                  <p>Command Buffer: <span className="text-green-400">{Array.from(keyBuffer).map(c => `${c}(${c.charCodeAt(0)})`).join(' ')}</span></p>
                  <p>Buffer Length: {keyBuffer.length}</p>
                  <p>Last Keystrokes: {lastKeystrokes.join(' ')}</p>
                  <div className="mt-2 text-xs">
                    <p>Current text: {JSON.stringify(currentText)}</p>
                    <p>Target text: {JSON.stringify(targetText)}</p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <h3 className="text-2xl font-bold mb-4">Game Complete!</h3>
              <p className="text-lg">Final Score: {score}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VimGame;
