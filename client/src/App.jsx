/**
 * DamnNotes - Enterprise Intelligence Workspace (Frontend)
 * Copyright (c) 2026 onlybugs05. All rights reserved.
 * PROPRIETARY AND CONFIDENTIAL.
 */
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { 
  Folder, File, ChevronRight, ChevronDown, 
  Plus, FolderPlus, Save, Edit3, BookOpen, Layout, TerminalSquare, Lock, X, Search, Trash2
} from 'lucide-react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import './App.css';

const TreeNode = ({ node, level = 0, onSelectFile, selectedFile, onSelectFolder, selectedFolder, onDeleteItem, filterText = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const isSelectedFile = selectedFile === node.path;
  const isSelectedFolder = selectedFolder === node.path;
  const paddingLeft = `${level * 16 + 16}px`;

  // Auto open folder if it contains a file that matches the filter, but just naive search is fine for now
  useEffect(() => {
    if (filterText && node.isDirectory) {
       setIsOpen(true);
    }
  }, [filterText, node.isDirectory]);

  const handleDelete = (e) => {
     e.stopPropagation();
     if(window.confirm(`Are you sure you want to delete ${node.name}?`)) {
        onDeleteItem(node.path);
     }
  };

  if (!node.isDirectory) {
    if (filterText && !node.name.toLowerCase().includes(filterText.toLowerCase())) return null;

    return (
      <div 
        className={`tree-node ${isSelectedFile ? 'active-node' : ''}`}
        style={{ paddingLeft }}
        onClick={(e) => { e.stopPropagation(); onSelectFile(node.path); }}
      >
        <div className="node-icon"><File size={16} /></div>
        <span className="node-name">{node.name}</span>
        <button className="delete-btn" onClick={handleDelete} title="Delete File"><Trash2 size={12} /></button>
      </div>
    );
  }

  // Hide folder if it doesn't match filter and children also don't
  const matchesFilter = !filterText || node.name.toLowerCase().includes(filterText.toLowerCase());
  const hasMatchingChildren = node.children && node.children.some(c => JSON.stringify(c).toLowerCase().includes(filterText.toLowerCase()));
  if (!matchesFilter && !hasMatchingChildren) return null;

  return (
    <div>
      <div 
        className={`tree-node folder-node ${isSelectedFolder ? 'active-folder' : ''}`}
        style={{ paddingLeft }}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
          onSelectFolder(node.path);
        }}
      >
        <div className="node-icon">
          {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <Folder size={16} style={{ marginLeft: 4, color: isSelectedFolder ? 'var(--accent)' : 'var(--folder-color)' }} />
        </div>
        <span className="node-name">{node.name}</span>
        <button className="delete-btn" onClick={handleDelete} title="Delete Folder"><Trash2 size={12} /></button>
      </div>
      {isOpen && node.children?.map((child, i) => (
        <TreeNode 
          key={i} 
          node={child} 
          level={level + 1} 
          onSelectFile={onSelectFile}
          selectedFile={selectedFile}
          onSelectFolder={onSelectFolder}
          selectedFolder={selectedFolder}
          filterText={filterText}
          onDeleteItem={onDeleteItem}
        />
      ))}
    </div>
  );
};

const WebTerminal = () => {
  const terminalRef = useRef(null);
  const xtermRef = useRef(null);
  const wsRef = useRef(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new Terminal({
      theme: { background: '#0d1117', foreground: '#e6edf3', cursor: '#58a6ff', selectionBackground: '#3fb95040' },
      fontFamily: '"Fira Code", "MesloLGS NF", monospace',
      fontSize: 14,
      cursorBlink: true,
      convertEol: true, // Fixes newline formatting stairs
      padding: 10
    });
    
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = term;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/api/terminal`);
    
    ws.onopen = () => {
      term.writeln('\x1b[1;34m========================================\x1b[0m');
      term.writeln('\x1b[1;32m  DamnNotes Secure Terminal Connected  \x1b[0m');
      term.writeln('\x1b[1;34m========================================\x1b[0m\n');
    };

    ws.onmessage = (event) => term.write(event.data);
    ws.onclose = () => term.writeln('\n\x1b[1;31mConnection closed.\x1b[0m');

    term.onData(data => { if (ws.readyState === WebSocket.OPEN) ws.send(data); });
    wsRef.current = ws;

    const handleResize = () => fitAddon.fit();
    window.addEventListener('resize', handleResize);
    setTimeout(() => fitAddon.fit(), 100);

    return () => {
      window.removeEventListener('resize', handleResize);
      term.dispose();
      ws.close();
    };
  }, []);

  return <div ref={terminalRef} className="terminal-container" />;
};

function App() {
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFolder, setSelectedFolder] = useState(''); // "" means root
  const [fileContent, setFileContent] = useState('');
  const [viewMode, setViewMode] = useState('split'); 
  const [searchQuery, setSearchQuery] = useState('');
  
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState('file'); 
  const [newItemPath, setNewItemPath] = useState('');
  
  const searchInputRef = useRef(null);

  useEffect(() => {
    verifyAndFetch();
  }, []);

  const headers = useCallback(() => ({
    'Content-Type': 'application/json'
  }), []);

  const verifyAndFetch = async () => {
    try {
      const res = await fetch('/api/files', { headers: headers() });
      if (res.ok) {
        setFiles(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectFile = async (filePath) => {
    setSelectedFile(filePath);
    const parts = filePath.split('/');
    parts.pop();
    setSelectedFolder(parts.join('/'));

    if (viewMode === 'terminal') setViewMode('split');
    
    try {
      const res = await fetch(`/api/file?filePath=${encodeURIComponent(filePath)}`, { headers: headers() });
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setFileContent(data.content);
    } catch (err) {
      console.error(err);
      setFileContent('Error loading file');
    }
  };

  const handleSelectFolder = (folderPath) => {
    setSelectedFolder(folderPath);
  };

  const handleDeleteItem = async (filePath) => {
    try {
      await fetch(`/api/file?filePath=${encodeURIComponent(filePath)}`, {
        method: 'DELETE',
        headers: headers()
      });
      verifyAndFetch();
      if (selectedFile === filePath) setSelectedFile(null);
    } catch (err) {
      console.error("Failed to delete", err);
    }
  };

  const [isSaving, setIsSaving] = useState(false);

  const saveFile = async () => {
    if (!selectedFile) return;
    try {
      setIsSaving(true);
      await fetch('/api/file', {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify({ filePath: selectedFile, content: fileContent })
      });
      setTimeout(() => setIsSaving(false), 1500);
    } catch (err) {
      console.error("Failed to save", err);
      setIsSaving(false);
    }
  };

  const openCreateModal = (type) => {
    setModalType(type);
    setNewItemPath(selectedFolder ? `${selectedFolder}/` : '');
    setModalOpen(true);
  };

  const handleCreate = async () => {
    if (!newItemPath) return;
    const path = newItemPath.trim();
    try {
      await fetch('/api/file', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ filePath: path, isDirectory: modalType === 'folder' })
      });
      setModalOpen(false);
      setNewItemPath('');
      verifyAndFetch();
      if (modalType === 'file') handleSelectFile(path);
    } catch (err) {
      console.error("Failed to create", err);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if typing in an interactive element unless overriding
      const isInput = ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName) && !modalOpen;
      
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdKey = isMac ? e.metaKey : e.ctrlKey;
      
      // Save Shortcut
      if (cmdKey && e.key === 's') {
        e.preventDefault();
        saveFile();
      }

      // Alt/Option Shortcuts (Much easier than Ctrl+Shift)
      if (e.altKey && !cmdKey && !e.shiftKey) {
        if (e.key.toLowerCase() === 't') {
          e.preventDefault();
          setViewMode(prev => prev === 'terminal' ? (selectedFile ? 'split' : 'split') : 'terminal');
        }
        if (e.key.toLowerCase() === 'n') {
          e.preventDefault();
          openCreateModal('file');
        }
        if (e.key.toLowerCase() === 'd') {
          e.preventDefault();
          openCreateModal('folder');
        }
        if (e.key.toLowerCase() === 's') {
           e.preventDefault();
           searchInputRef.current?.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedFile, fileContent, modalOpen, selectedFolder]);

  return (
    <div className="app-container">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="brand"><div className="brand-dot"></div> DamnNotes</div>
          <div className="header-actions">
            <button className="icon-btn tooltip-trigger" onClick={() => openCreateModal('file')}>
              <Plus size={16} />
              <span className="tooltip">New File (Alt+N)</span>
            </button>
            <button className="icon-btn tooltip-trigger" onClick={() => openCreateModal('folder')}>
              <FolderPlus size={16} />
              <span className="tooltip">New Folder (Alt+D)</span>
            </button>
          </div>
        </div>
        
        <div className="sidebar-search">
            <Search size={14} className="search-icon" />
            <input 
              ref={searchInputRef}
              type="text" 
              placeholder="Search files... (Alt+S)" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
        </div>

        <div className="workspace-title" onClick={() => setSelectedFolder('')}>
           <Folder size={14} style={{ marginRight: 6 }} /> WORKSPACE
           <span className="file-count">{files.reduce((acc, curr) => acc + (curr.children ? curr.children.length : 1), 0)} Nodes</span>
           {selectedFolder === '' && <span className="active-dot"></span>}
        </div>

        <div className="file-tree">
          {files.map((node, i) => (
             <TreeNode 
              key={i} node={node} 
              onSelectFile={handleSelectFile} selectedFile={selectedFile}
              onSelectFolder={handleSelectFolder} selectedFolder={selectedFolder}
              filterText={searchQuery} onDeleteItem={handleDeleteItem}
            />
          ))}
        </div>
        
        <div className="sidebar-footer">
           <div className="system-stats">
              <div className="stat"><div className="stat-dot pulse"></div> Local Encryption Active</div>
           </div>
           <button className={`terminal-btn ${viewMode === 'terminal' ? 'active' : ''}`} onClick={() => setViewMode('terminal')}>
             <TerminalSquare size={16} style={{marginRight: 8}} />
             Web Terminal <span className="shortcut-hint">Alt+T</span>
           </button>
        </div>
      </div>

      {/* Editor/Viewer Pane */}
      <div className="editor-pane">
        {viewMode === 'terminal' ? (
          <div className="terminal-wrapper">
            <div className="editor-header terminal-header">
              <div className="file-name">
                <div className="header-status-dot pulse"></div>
                <TerminalSquare size={16} style={{color: 'var(--accent)'}} /> ⚡ LIVE_TERMINAL_SESSION
              </div>
              <div className="header-actions">
                 <span className="terminal-info">SH: BASH_INST | ENC: LOCALHOST_ONLY</span>
              </div>
            </div>
            <WebTerminal />
          </div>
        ) : selectedFile ? (
          <>
            <div className="editor-header">
              <div className="file-name"><div className="header-status-dot"></div> <File size={16} color="var(--text-secondary)" /> {selectedFile}</div>
              <div className="header-actions">
                <div className="view-toggles">
                  <button className={`icon-btn toggle-btn ${viewMode === 'read' ? 'active' : ''}`} onClick={() => setViewMode('read')} title="Read Mode">
                    <BookOpen size={16} />
                  </button>
                  <button className={`icon-btn toggle-btn ${viewMode === 'split' ? 'active' : ''}`} onClick={() => setViewMode('split')} title="Split View">
                    <Layout size={16} />
                  </button>
                  <button className={`icon-btn toggle-btn ${viewMode === 'edit' ? 'active' : ''}`} onClick={() => setViewMode('edit')} title="Edit Mode">
                    <Edit3 size={16} />
                  </button>
                </div>
                <div className="divider"></div>
                <button className={`btn btn-save ${isSaving ? 'saved' : ''}`} onClick={saveFile}>
                  <Save size={16} style={{marginRight: 6}} /> {isSaving ? 'Payload Saved!' : 'Save Note'} <span className="hint">Ctrl+S</span>
                </button>
              </div>
            </div>
            
            <div className={`main-content ${viewMode === 'split' ? 'split-view' : ''}`}>
              {(viewMode === 'edit' || viewMode === 'split') && (
                <div className="editor-wrapper">
                  <textarea
                    className="editor-textarea" value={fileContent} onChange={e => setFileContent(e.target.value)}
                    spellCheck="false" placeholder="Draft your report or notes..."
                  />
                </div>
              )}
              {(viewMode === 'read' || viewMode === 'split') && (
                <div className="preview-wrapper">
                  <div className="markdown-preview markdown-body">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        code({node, inline, className, children, ...props}) {
                          const match = /language-(\w+)/.exec(className || '');
                          return !inline && match ? (
                            <SyntaxHighlighter
                              children={String(children).replace(/\n$/, '')}
                              style={oneDark}
                              language={match[1]}
                              PreTag="div"
                              {...props}
                            />
                          ) : (
                            <code className={className} {...props}>
                              {children}
                            </code>
                          );
                        }
                      }}
                    >
                      {fileContent || '*No content available...*'}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="empty-state">
            <div className="dossier-card glass-panel">
               <div className="dossier-header">
                  <div className="dossier-badge">CONFIDENTIAL</div>
                  <div className="dossier-id">MISSION_ID: [{Math.random().toString(36).substring(2, 9).toUpperCase()}]</div>
               </div>
               <div className="dossier-body">
                  <h2 className="glow-text">DamnNotes Intelligence Dashboard</h2>
                  <p className="dossier-subtext">Secure Localhost Environment | No Network Broadcast</p>
                  
                  <div className="dossier-stats">
                     <div className="dossier-stat">
                        <span className="label">Status</span>
                        <span className="value text-green">READY_FOR_RECON</span>
                     </div>
                     <div className="dossier-stat">
                        <span className="label">Uptime</span>
                        <span className="value">SYSTEM_ONLINE</span>
                     </div>
                  </div>

                  <div className="shortcut-grid">
                    <div className="shortcut-item">
                      <kbd>Alt</kbd> + <kbd>T</kbd>
                      <span className="action-name">Toggle Terminal</span>
                    </div>
                    <div className="shortcut-item">
                      <kbd>Alt</kbd> + <kbd>N</kbd>
                      <span className="action-name">New Finding</span>
                    </div>
                    <div className="shortcut-item">
                       <kbd>Alt</kbd> + <kbd>S</kbd>
                       <span className="action-name">Fuzzy Data Search</span>
                    </div>
                  </div>

                  <div className="dossier-footer">
                     Ready to document vulnerabilities or run scanning tools.
                  </div>
               </div>
            </div>
            <div className="bg-glitch"></div>
          </div>
        )}
      </div>

      {/* Creation Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal glass-panel" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
               <h3>Create {modalType === 'file' ? 'New File' : 'New Folder'}</h3>
               <button className="icon-btn" onClick={() => setModalOpen(false)}><X size={18}/></button>
            </div>
            <div className="input-group">
               <span className="path-prefix">{selectedFolder ? `${selectedFolder}/` : '/'}</span>
               <input 
                 autoFocus type="text" placeholder={modalType === 'file' ? 'recon.md' : 'nmap_scans'}
                 value={newItemPath.startsWith(selectedFolder && selectedFolder + '/') ? newItemPath.replace(selectedFolder + '/', '') : newItemPath}
                 onChange={e => {
                    const val = e.target.value;
                    setNewItemPath(selectedFolder ? `${selectedFolder}/${val}` : val);
                 }}
                 onKeyDown={e => e.key === 'Enter' && handleCreate()}
                 className="glass-input path-input"
               />
            </div>
            <div className="modal-actions" style={{marginTop: 20}}>
              <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreate}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
