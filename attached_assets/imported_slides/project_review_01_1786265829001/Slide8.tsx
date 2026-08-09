import React, { useState, useEffect, useRef } from "react";
import img_1 from "./assets/images/image_6.png";
import img_bg from "./assets/images/image_4.jpg";
const Slide8: React.FC = () => {
  const outerRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState({
    s: 1,
    x: 0,
    y: 0
  });
  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      const s = Math.min(w / 960, h / 720);
      setLayout({
        s,
        x: (w - 960 * s) / 2,
        y: (h - 720 * s) / 2
      });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return <div id="slide-8" ref={outerRef} className="w-screen h-screen overflow-hidden relative" style={{
    backgroundColor: "#000"
  }}><div id="slide-inner-8" style={{
      position: "absolute",
      width: "960px",
      height: "720px",
      overflow: "hidden",
      transformOrigin: "top left",
      color: "#000000",
      backgroundImage: `url(${img_bg})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      transform: `scale(${layout.s})`,
      left: layout.x + "px",
      top: layout.y + "px"
    }}><div key={0} style={{
        position: "absolute",
        left: "85.33px",
        top: "14.33px",
        width: "864px",
        height: "73.03px",
        boxSizing: "border-box",
        backgroundColor: "transparent",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        padding: "4.8px 0px 0px 0px",
        wordWrap: "break-word"
      }}><p style={{
          textAlign: "center",
          lineHeight: "1.2",
          fontSize: "calc(30pt * var(--pptx-font-scale, 1))",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: "calc(30pt * var(--pptx-font-scale, 1))",
            fontFamily: "'Times New Roman', Times, serif",
            fontWeight: "700",
            color: "#000000"
          }}>{"SCIE PAPER & CRITIQUE"}</span></p></div><div key={1} style={{
        position: "absolute",
        left: "48px",
        top: "667.33px",
        width: "224px",
        height: "38.33px",
        boxSizing: "border-box",
        backgroundColor: "transparent"
      }} /><div key={2} style={{
        position: "absolute",
        left: "597.31px",
        top: "656.46px",
        width: "341.14px",
        height: "42.01px",
        boxSizing: "border-box",
        backgroundColor: "transparent",
        padding: "4.8px 9.6px 4.8px 9.6px",
        wordWrap: "break-word"
      }}><p style={{
          textAlign: "center",
          lineHeight: "1.2",
          fontSize: "calc(20pt * var(--pptx-font-scale, 1))",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: "calc(20pt * var(--pptx-font-scale, 1))",
            fontFamily: "'Times New Roman', Times, serif",
            fontWeight: "700"
          }}>{"CRITIQUE "}</span><span style={{
            fontSize: "calc(20pt * var(--pptx-font-scale, 1))",
            fontFamily: "'Times New Roman', Times, serif",
            fontWeight: "700"
          }}>{"RATING"}</span></p></div><div key={3} style={{
        position: "absolute",
        left: "212.03px",
        top: "468.02px",
        width: "127.61px",
        height: "16.18px",
        boxSizing: "border-box",
        backgroundColor: "transparent",
        border: "2px solid #FF0000"
      }} /><div key={4} style={{
        position: "absolute",
        left: "228.74px",
        top: "655.67px",
        width: "316.8px",
        height: "42.01px",
        boxSizing: "border-box",
        backgroundColor: "transparent",
        padding: "4.8px 9.6px 4.8px 9.6px",
        wordWrap: "break-word"
      }}><p style={{
          lineHeight: "1.2",
          fontSize: "calc(20pt * var(--pptx-font-scale, 1))",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: "calc(20pt * var(--pptx-font-scale, 1))",
            fontFamily: "'Times New Roman', Times, serif",
            fontWeight: "700",
            color: "#000000"
          }}>{"SCIE PAPER"}</span></p></div><img key={5} src={img_1} alt="Screenshot 2026-07-19 234507.png" style={{
        position: "absolute",
        left: "79.65px",
        top: "191.02px",
        width: "530.63px",
        height: "456.69px",
        boxSizing: "border-box",
        objectFit: "fill"
      }} /><table key={6} style={{
        position: "absolute",
        left: "618.12px",
        top: "89.14px",
        width: "326.21px",
        height: "484.48px",
        borderCollapse: "collapse",
        tableLayout: "fixed"
      }}><colgroup><col style={{
            width: "50%"
          }} /><col style={{
            width: "50%"
          }} /></colgroup><tbody><tr style={{
            height: "22.59px"
          }}><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "12pt",
              borderTop: "1px solid #C4C7C5",
              borderBottom: "1px solid #C4C7C5",
              borderLeft: "1px solid #C4C7C5",
              borderRight: "1px solid #C4C7C5"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(12pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(12pt * var(--pptx-font-scale, 1))",
                  fontFamily: "'Google Sans Text', sans-serif",
                  fontWeight: "700",
                  color: "#1F1F1F"
                }}>{"Metric"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "12pt",
              borderTop: "1px solid #C4C7C5",
              borderBottom: "1px solid #C4C7C5",
              borderLeft: "1px solid #C4C7C5",
              borderRight: "1px solid #C4C7C5"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(12pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(12pt * var(--pptx-font-scale, 1))",
                  fontFamily: "'Google Sans Text', sans-serif",
                  fontWeight: "700",
                  color: "#1F1F1F"
                }}>{"Score"}</span></p></td></tr><tr style={{
            height: "22.59px"
          }}><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "12pt",
              borderTop: "1px solid #C4C7C5",
              borderBottom: "1px solid #C4C7C5",
              borderLeft: "1px solid #C4C7C5",
              borderRight: "1px solid #C4C7C5"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(12pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(12pt * var(--pptx-font-scale, 1))",
                  fontFamily: "'Google Sans Text', sans-serif",
                  fontWeight: "700",
                  color: "#1F1F1F"
                }}>{"Innovation"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "12pt",
              borderTop: "1px solid #C4C7C5",
              borderBottom: "1px solid #C4C7C5",
              borderLeft: "1px solid #C4C7C5",
              borderRight: "1px solid #C4C7C5"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(12pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(12pt * var(--pptx-font-scale, 1))",
                  fontFamily: "'Google Sans Text', sans-serif",
                  color: "#1F1F1F"
                }}>{"8.5/10"}</span></p></td></tr><tr style={{
            height: "37.87px"
          }}><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "12pt",
              borderTop: "1px solid #C4C7C5",
              borderBottom: "1px solid #C4C7C5",
              borderLeft: "1px solid #C4C7C5",
              borderRight: "1px solid #C4C7C5"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(12pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(12pt * var(--pptx-font-scale, 1))",
                  fontFamily: "'Google Sans Text', sans-serif",
                  fontWeight: "700",
                  color: "#1F1F1F"
                }}>{"Research Novelty"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "12pt",
              borderTop: "1px solid #C4C7C5",
              borderBottom: "1px solid #C4C7C5",
              borderLeft: "1px solid #C4C7C5",
              borderRight: "1px solid #C4C7C5"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(12pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(12pt * var(--pptx-font-scale, 1))",
                  fontFamily: "'Google Sans Text', sans-serif",
                  color: "#1F1F1F"
                }}>{"8.0/10"}</span></p></td></tr><tr style={{
            height: "37.87px"
          }}><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "12pt",
              borderTop: "1px solid #C4C7C5",
              borderBottom: "1px solid #C4C7C5",
              borderLeft: "1px solid #C4C7C5",
              borderRight: "1px solid #C4C7C5"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(12pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(12pt * var(--pptx-font-scale, 1))",
                  fontFamily: "'Google Sans Text', sans-serif",
                  fontWeight: "700",
                  color: "#1F1F1F"
                }}>{"Problem Selection"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "12pt",
              borderTop: "1px solid #C4C7C5",
              borderBottom: "1px solid #C4C7C5",
              borderLeft: "1px solid #C4C7C5",
              borderRight: "1px solid #C4C7C5"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(12pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(12pt * var(--pptx-font-scale, 1))",
                  fontFamily: "'Google Sans Text', sans-serif",
                  color: "#1F1F1F"
                }}>{"9.0/10"}</span></p></td></tr><tr style={{
            height: "22.59px"
          }}><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "12pt",
              borderTop: "1px solid #C4C7C5",
              borderBottom: "1px solid #C4C7C5",
              borderLeft: "1px solid #C4C7C5",
              borderRight: "1px solid #C4C7C5"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(12pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(12pt * var(--pptx-font-scale, 1))",
                  fontFamily: "'Google Sans Text', sans-serif",
                  fontWeight: "700",
                  color: "#1F1F1F"
                }}>{"Solution Design"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "12pt",
              borderTop: "1px solid #C4C7C5",
              borderBottom: "1px solid #C4C7C5",
              borderLeft: "1px solid #C4C7C5",
              borderRight: "1px solid #C4C7C5"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(12pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(12pt * var(--pptx-font-scale, 1))",
                  fontFamily: "'Google Sans Text', sans-serif",
                  color: "#1F1F1F"
                }}>{"6.0/10"}</span></p></td></tr><tr style={{
            height: "25.18px"
          }}><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "12pt",
              borderTop: "1px solid #C4C7C5",
              borderBottom: "1px solid #C4C7C5",
              borderLeft: "1px solid #C4C7C5",
              borderRight: "1px solid #C4C7C5"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(12pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(12pt * var(--pptx-font-scale, 1))",
                  fontFamily: "'Google Sans Text', sans-serif",
                  fontWeight: "700",
                  color: "#1F1F1F"
                }}>{"AI Architecture"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "12pt",
              borderTop: "1px solid #C4C7C5",
              borderBottom: "1px solid #C4C7C5",
              borderLeft: "1px solid #C4C7C5",
              borderRight: "1px solid #C4C7C5"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(12pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(12pt * var(--pptx-font-scale, 1))",
                  fontFamily: "'Google Sans Text', sans-serif",
                  color: "#1F1F1F"
                }}>{"7.5/10"}</span></p></td></tr><tr style={{
            height: "37.87px"
          }}><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "12pt",
              borderTop: "1px solid #C4C7C5",
              borderBottom: "1px solid #C4C7C5",
              borderLeft: "1px solid #C4C7C5",
              borderRight: "1px solid #C4C7C5"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(12pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(12pt * var(--pptx-font-scale, 1))",
                  fontFamily: "'Google Sans Text', sans-serif",
                  fontWeight: "700",
                  color: "#1F1F1F"
                }}>{"RAG Implementation"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "12pt",
              borderTop: "1px solid #C4C7C5",
              borderBottom: "1px solid #C4C7C5",
              borderLeft: "1px solid #C4C7C5",
              borderRight: "1px solid #C4C7C5"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(12pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(12pt * var(--pptx-font-scale, 1))",
                  fontFamily: "'Google Sans Text', sans-serif",
                  color: "#1F1F1F"
                }}>{"6.5/10"}</span></p></td></tr><tr style={{
            height: "37.87px"
          }}><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "12pt",
              borderTop: "1px solid #C4C7C5",
              borderBottom: "1px solid #C4C7C5",
              borderLeft: "1px solid #C4C7C5",
              borderRight: "1px solid #C4C7C5"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(12pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(12pt * var(--pptx-font-scale, 1))",
                  fontFamily: "'Google Sans Text', sans-serif",
                  fontWeight: "700",
                  color: "#1F1F1F"
                }}>{"Technology Stack"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "12pt",
              borderTop: "1px solid #C4C7C5",
              borderBottom: "1px solid #C4C7C5",
              borderLeft: "1px solid #C4C7C5",
              borderRight: "1px solid #C4C7C5"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(12pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(12pt * var(--pptx-font-scale, 1))",
                  fontFamily: "'Google Sans Text', sans-serif",
                  color: "#1F1F1F"
                }}>{"7.0/10"}</span></p></td></tr><tr style={{
            height: "37.87px"
          }}><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "12pt",
              borderTop: "1px solid #C4C7C5",
              borderBottom: "1px solid #C4C7C5",
              borderLeft: "1px solid #C4C7C5",
              borderRight: "1px solid #C4C7C5"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(12pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(12pt * var(--pptx-font-scale, 1))",
                  fontFamily: "'Google Sans Text', sans-serif",
                  fontWeight: "700",
                  color: "#1F1F1F"
                }}>{"Technical Complexity"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "12pt",
              borderTop: "1px solid #C4C7C5",
              borderBottom: "1px solid #C4C7C5",
              borderLeft: "1px solid #C4C7C5",
              borderRight: "1px solid #C4C7C5"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(12pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(12pt * var(--pptx-font-scale, 1))",
                  fontFamily: "'Google Sans Text', sans-serif",
                  color: "#1F1F1F"
                }}>{"8.5/10"}</span></p></td></tr><tr style={{
            height: "22.59px"
          }}><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "12pt",
              borderTop: "1px solid #C4C7C5",
              borderBottom: "1px solid #C4C7C5",
              borderLeft: "1px solid #C4C7C5",
              borderRight: "1px solid #C4C7C5"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(12pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(12pt * var(--pptx-font-scale, 1))",
                  fontFamily: "'Google Sans Text', sans-serif",
                  fontWeight: "700",
                  color: "#1F1F1F"
                }}>{"Scalability"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "12pt",
              borderTop: "1px solid #C4C7C5",
              borderBottom: "1px solid #C4C7C5",
              borderLeft: "1px solid #C4C7C5",
              borderRight: "1px solid #C4C7C5"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(12pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(12pt * var(--pptx-font-scale, 1))",
                  fontFamily: "'Google Sans Text', sans-serif",
                  color: "#1F1F1F"
                }}>{"4.0/10"}</span></p></td></tr><tr style={{
            height: "43.43px"
          }}><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "12pt",
              borderTop: "1px solid #C4C7C5",
              borderBottom: "1px solid #C4C7C5",
              borderLeft: "1px solid #C4C7C5",
              borderRight: "1px solid #C4C7C5"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(12pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(12pt * var(--pptx-font-scale, 1))",
                  fontFamily: "'Google Sans Text', sans-serif",
                  fontWeight: "700",
                  color: "#1F1F1F"
                }}>{"Security & Safety"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "12pt",
              borderTop: "1px solid #C4C7C5",
              borderBottom: "1px solid #C4C7C5",
              borderLeft: "1px solid #C4C7C5",
              borderRight: "1px solid #C4C7C5"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(12pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(12pt * var(--pptx-font-scale, 1))",
                  fontFamily: "'Google Sans Text', sans-serif",
                  color: "#1F1F1F"
                }}>{"8.5/10"}</span></p></td></tr><tr style={{
            height: "22.59px"
          }}><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "12pt",
              borderTop: "1px solid #C4C7C5",
              borderBottom: "1px solid #C4C7C5",
              borderLeft: "1px solid #C4C7C5",
              borderRight: "1px solid #C4C7C5"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(12pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(12pt * var(--pptx-font-scale, 1))",
                  fontFamily: "'Google Sans Text', sans-serif",
                  fontWeight: "700",
                  color: "#1F1F1F"
                }}>{"Explainability"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "12pt",
              borderTop: "1px solid #C4C7C5",
              borderBottom: "1px solid #C4C7C5",
              borderLeft: "1px solid #C4C7C5",
              borderRight: "1px solid #C4C7C5"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(12pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(12pt * var(--pptx-font-scale, 1))",
                  fontFamily: "'Google Sans Text', sans-serif",
                  color: "#1F1F1F"
                }}>{"9.0/10"}</span></p></td></tr><tr style={{
            height: "37.87px"
          }}><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "12pt",
              borderTop: "1px solid #C4C7C5",
              borderBottom: "1px solid #C4C7C5",
              borderLeft: "1px solid #C4C7C5",
              borderRight: "1px solid #C4C7C5"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(12pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(12pt * var(--pptx-font-scale, 1))",
                  fontFamily: "'Google Sans Text', sans-serif",
                  fontWeight: "700",
                  color: "#1F1F1F"
                }}>{"Practical Usability"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "12pt",
              borderTop: "1px solid #C4C7C5",
              borderBottom: "1px solid #C4C7C5",
              borderLeft: "1px solid #C4C7C5",
              borderRight: "1px solid #C4C7C5"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(12pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(12pt * var(--pptx-font-scale, 1))",
                  fontFamily: "'Google Sans Text', sans-serif",
                  color: "#1F1F1F"
                }}>{"5.5/10"}</span></p></td></tr><tr style={{
            height: "37.87px"
          }}><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "12pt",
              borderTop: "1px solid #C4C7C5",
              borderBottom: "1px solid #C4C7C5",
              borderLeft: "1px solid #C4C7C5",
              borderRight: "1px solid #C4C7C5"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(12pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(12pt * var(--pptx-font-scale, 1))",
                  fontFamily: "'Google Sans Text', sans-serif",
                  fontWeight: "700",
                  color: "#1F1F1F"
                }}>{"Publication Potential"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "12pt",
              borderTop: "1px solid #C4C7C5",
              borderBottom: "1px solid #C4C7C5",
              borderLeft: "1px solid #C4C7C5",
              borderRight: "1px solid #C4C7C5"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(12pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(12pt * var(--pptx-font-scale, 1))",
                  fontFamily: "'Google Sans Text', sans-serif",
                  color: "#1F1F1F"
                }}>{"8.0/10"}</span></p></td></tr><tr style={{
            height: "37.87px"
          }}><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "12pt",
              borderTop: "1px solid #C4C7C5",
              borderBottom: "1px solid #C4C7C5",
              borderLeft: "1px solid #C4C7C5",
              borderRight: "1px solid #C4C7C5"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(12pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(12pt * var(--pptx-font-scale, 1))",
                  fontFamily: "'Google Sans Text', sans-serif",
                  fontWeight: "700",
                  color: "#1F1F1F"
                }}>{"Overall Project Quality"}</span></p></td><td style={{
              padding: "4px 8px",
              verticalAlign: "top",
              fontSize: "12pt",
              borderTop: "1px solid #C4C7C5",
              borderBottom: "1px solid #C4C7C5",
              borderLeft: "1px solid #C4C7C5",
              borderRight: "1px solid #C4C7C5"
            }}><p style={{
                lineHeight: "1.2",
                fontSize: "calc(12pt * var(--pptx-font-scale, 1))",
                marginTop: "0",
                marginBottom: "0"
              }}><span style={{
                  fontSize: "calc(12pt * var(--pptx-font-scale, 1))",
                  fontFamily: "'Google Sans Text', sans-serif",
                  color: "#1F1F1F"
                }}>{"7.3/10"}</span></p></td></tr></tbody></table></div></div>;
};
export default Slide8;
