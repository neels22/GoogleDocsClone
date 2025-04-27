import { useState, useEffect, useCallback } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import { TOOLBAR_OPTIONS, SAVE_INTERVAL_MS } from '../constants';
import { io, Socket } from 'socket.io-client';
import { useParams } from 'react-router-dom';
import { LLMDialog } from './LLMDialog';

export const TextEditor = () => {
    const [socket, setSocket] = useState<Socket>() ;
    const [quill, setQuill] = useState<Quill>() ;
    const { id: documentId } = useParams() ;
    const [isLLMDialogOpen, setIsLLMDialogOpen] = useState(false);
    const [selectedText, setSelectedText] = useState("");
    const [savedRange, setSavedRange] = useState<{ index: number; length: number } | null>(null);
    const [llmResponse, setLlmResponse] = useState<string | null>(null);
    const [showLlmResponse, setShowLlmResponse] = useState(false);
    
    useEffect(() => {
        const skt = io(import.meta.env.VITE_SERVER_URL) ;
        setSocket(skt) ;
        return () => {
            skt.disconnect() ;
        }
    }, [])

    const handleLLMResponse = async (query: string) => {
        if (!socket || !quill) return;

        try {
            const response = await fetch(`${import.meta.env.VITE_SERVER_URL}/llm`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: selectedText,
                    query: query
                })
            });

            const data = await response.json();
            const range = savedRange;
            if (range) {
                const insertAt = range.index + range.length;
                quill.insertText(insertAt, '\n' + data.response + '\n', 'user');
                quill.formatLine(
                  insertAt + 1,
                  data.response.length,
                  { blockquote: true },
                  'user'
                );
                quill.setSelection(insertAt + data.response.length + 2, 0, 'user');
            }
            setIsLLMDialogOpen(false);
        } catch (error) {
            console.error('Error getting LLM response:', error);
        }
    };

    const wrapperRef = useCallback((wrapper: HTMLDivElement) => {
        if(!wrapper) return ;
        wrapper.innerHTML = '' ;
    
        const editor = document.createElement("div") ;
        wrapper.append(editor) ;

        const qul = new Quill(editor, 
            { 
                theme: "snow", 
                modules: {
                toolbar: TOOLBAR_OPTIONS
              }
            });
        qul.disable() ;   
        qul.setText("Loading...") ;
        setQuill(qul) ;

        const toolbar = wrapper.querySelector('.ql-toolbar');
        if (toolbar) {
            const llmBtn = document.createElement('button');
            llmBtn.type = 'button';
            llmBtn.innerText = 'LLM';
            llmBtn.className = 'ql-llm custom-llm-btn';
            llmBtn.style.marginLeft = '8px';
            toolbar.appendChild(llmBtn);

            llmBtn.onclick = () => {
                if (qul) {
                    const range = qul.getSelection();
                    if (range) {
                        const text = qul.getText(range.index, range.length);
                        setSelectedText(text);
                        setSavedRange(range);
                        setIsLLMDialogOpen(true);
                    }
                }
            };
        }
    }, [])

    // Sending changes to server.
    useEffect(() => {
        if(!socket || !quill){
            return ;
        }

        // @ts-ignore
        const handler = (delta, oldDelta, source) => {
            if (source !== "user") return ;
            socket.emit("send-changes", delta) ;
        }

        quill.on("text-change", handler) ;

        return () => {
            quill.off("text-change", handler) ;
        }

    }, [socket, quill])

    // Receiving changes from server.
    useEffect(() => {
        if(!socket || !quill){
            return ;
        }

        // @ts-ignore
        const handler = (delta) => {
            quill.updateContents(delta) ;
        }

        socket.on("receive-changes", handler) ;

        return () => {
            socket.off("receive-changes", handler) ;
        }

    }, [socket, quill])

    useEffect(() => {
        if(!socket || !quill){
            return ;
        }

        socket.once("load-document", document => {
            quill.setContents(document) ;
            quill.enable() ;
        })

        const documentName = localStorage.getItem(`document-name-for-${documentId}`) || "Untitled" ;
        socket.emit("get-document", { documentId, documentName }) ;

    }, [socket, quill, documentId])

    useEffect(() => {
        if(!socket || !quill){
            return ;
        }
        const interval = setInterval(() => {
            socket.emit("save-document", quill.getContents()) ;
        }, SAVE_INTERVAL_MS);

        return () => {
            clearInterval(interval) ;
            localStorage.clear() ;
        }
    }, [socket, quill])

    return(
        <div className="editorContainer" ref={wrapperRef}>
            <LLMDialog 
                isOpen={isLLMDialogOpen}
                onClose={() => setIsLLMDialogOpen(false)}
                onSend={handleLLMResponse}
                selectedText={selectedText}
            />
            {showLlmResponse && (
              <div
                style={{
                  position: 'fixed',
                  top: 0, left: 0, right: 0, bottom: 0,
                  background: 'rgba(0,0,0,0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1000
                }}
                onClick={() => setShowLlmResponse(false)}
              >
                <div
                  style={{
                    background: 'white',
                    padding: '2rem',
                    borderRadius: '8px',
                    maxWidth: '600px',
                    width: '90%',
                    boxShadow: '0 2px 16px rgba(0,0,0,0.2)',
                    position: 'relative'
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  <h2 style={{marginTop: 0}}>LLM Response</h2>
                  <div style={{whiteSpace: 'pre-wrap', marginBottom: '1rem'}}>{llmResponse}</div>
                  <button onClick={() => setShowLlmResponse(false)}>Close</button>
                </div>
              </div>
            )}
        </div>
    )
}