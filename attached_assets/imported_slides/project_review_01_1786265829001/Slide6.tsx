import React, { useState, useEffect, useRef } from "react";
import img_bg from "./assets/images/image_4.jpg";
const Slide6: React.FC = () => {
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
  return <div id="slide-6" ref={outerRef} className="w-screen h-screen overflow-hidden relative" style={{
    backgroundColor: "#000"
  }}><div id="slide-inner-6" style={{
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
        left: "221.58px",
        top: "59.27px",
        width: "712px",
        height: "58.17px",
        boxSizing: "border-box",
        backgroundColor: "transparent",
        padding: "4.8px 9.6px 4.8px 9.6px",
        wordWrap: "break-word"
      }}><p style={{
          textAlign: "left",
          lineHeight: "1.2",
          paddingLeft: "96px",
          fontSize: "calc(30pt * var(--pptx-font-scale, 1))",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: "calc(30pt * var(--pptx-font-scale, 1))",
            fontFamily: "'Times New Roman', Times, serif",
            fontWeight: "700",
            color: "#000000"
          }}>{"PROPOSED IDEA"}</span></p></div><div key={1} style={{
        position: "absolute",
        left: "88.86px",
        top: "126.85px",
        width: "830.98px",
        height: "542.85px",
        boxSizing: "border-box",
        backgroundColor: "transparent",
        padding: "4.8px 9.6px 4.8px 9.6px",
        wordWrap: "break-word"
      }}><p style={{
          textAlign: "justify",
          lineHeight: "1.8",
          textIndent: "-36px",
          paddingLeft: "36px",
          fontSize: "calc(20pt * var(--pptx-font-scale, 1))",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            marginRight: "8px"
          }}>{"v"}</span><span style={{
            fontSize: "calc(20pt * var(--pptx-font-scale, 1))",
            fontFamily: "'Times New Roman', Times, serif"
          }}>{"The proposed system introduces a Deterministic Epistemic Arbitration (DEA) framework to safely resolve conflicting medical guidelines"}</span><span style={{
            fontSize: "calc(20pt * var(--pptx-font-scale, 1))",
            fontFamily: "'Times New Roman', Times, serif"
          }}>{"."}</span></p><p style={{
          textAlign: "justify",
          lineHeight: "1.8",
          textIndent: "-36px",
          paddingLeft: "36px",
          fontSize: "calc(20pt * var(--pptx-font-scale, 1))",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            marginRight: "8px"
          }}>{"v"}</span><span style={{
            fontSize: "calc(20pt * var(--pptx-font-scale, 1))",
            fontFamily: "'Times New Roman', Times, serif"
          }}>{"It enforces strict information "}</span><span style={{
            fontSize: "calc(20pt * var(--pptx-font-scale, 1))",
            fontFamily: "'Times New Roman', Times, serif"
          }}>{"siloing"}</span><span style={{
            fontSize: "calc(20pt * var(--pptx-font-scale, 1))",
            fontFamily: "'Times New Roman', Times, serif"
          }}>{" by restricting specialized AI agents to distinct domains, such as disease protocols and pharmacological contraindications"}</span><span style={{
            fontSize: "calc(20pt * var(--pptx-font-scale, 1))",
            fontFamily: "'Times New Roman', Times, serif"
          }}>{"."}</span></p><p style={{
          textAlign: "justify",
          lineHeight: "1.8",
          textIndent: "-36px",
          paddingLeft: "36px",
          fontSize: "calc(20pt * var(--pptx-font-scale, 1))",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            marginRight: "8px"
          }}>{"v"}</span><span style={{
            fontSize: "calc(20pt * var(--pptx-font-scale, 1))",
            fontFamily: "'Times New Roman', Times, serif"
          }}>{"When a clinical conflict is detected, the system bypasses AI-driven consensus and applies a hardcoded mathematical scoring matrix to prioritize evidence based on clinical hierarchy"}</span><span style={{
            fontSize: "calc(20pt * var(--pptx-font-scale, 1))",
            fontFamily: "'Times New Roman', Times, serif"
          }}>{"."}</span></p><p style={{
          textAlign: "justify",
          lineHeight: "1.8",
          textIndent: "-36px",
          paddingLeft: "36px",
          fontSize: "calc(20pt * var(--pptx-font-scale, 1))",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            marginRight: "8px"
          }}>{"v"}</span><span style={{
            fontSize: "calc(20pt * var(--pptx-font-scale, 1))",
            fontFamily: "'Times New Roman', Times, serif"
          }}>{"This approach guarantees that final treatment recommendations are mathematically bounded, clinically safe, and fully explainable for healthcare professionals."}</span></p></div></div></div>;
};
export default Slide6;
