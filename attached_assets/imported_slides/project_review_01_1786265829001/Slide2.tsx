import React, { useState, useEffect, useRef } from "react";
import img_bg from "./assets/images/image_4.jpg";
const Slide2: React.FC = () => {
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
  return <div id="slide-2" ref={outerRef} className="w-screen h-screen overflow-hidden relative" style={{
    backgroundColor: "#000"
  }}><div id="slide-inner-2" style={{
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
        left: "70.31px",
        top: "138.45px",
        width: "861.28px",
        height: "515.92px",
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
            fontFamily: "'Times New Roman', Times, serif",
            color: "#000000"
          }}>{"Our proposed project is an AI-based Clinical Decision Support system designed to resolve conflicting medical guidelines using a Multi-Agent RAG architecture"}</span><span style={{
            fontSize: "calc(20pt * var(--pptx-font-scale, 1))",
            fontFamily: "'Times New Roman', Times, serif",
            color: "#000000"
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
            fontFamily: "'Times New Roman', Times, serif",
            color: "#000000"
          }}>{"It processes complex patient profiles involving multiple diseases and retrieves targeted medical evidence from trusted clinical and pharmacological databases"}</span><span style={{
            fontSize: "calc(20pt * var(--pptx-font-scale, 1))",
            fontFamily: "'Times New Roman', Times, serif",
            color: "#000000"
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
            fontFamily: "'Times New Roman', Times, serif",
            color: "#000000"
          }}>{"The system utilizes specialized AI agents and a deterministic mathematical matrix to safely arbitrate contradictory medical knowledge."}</span></p><p style={{
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
            fontFamily: "'Times New Roman', Times, serif",
            color: "#000000"
          }}>{"Such medical AI systems can support healthcare professionals and clinical researchers by delivering traceable, accurate, and safe treatment recommendations for "}</span><span style={{
            fontSize: "calc(20pt * var(--pptx-font-scale, 1))",
            fontFamily: "'Times New Roman', Times, serif",
            color: "#000000"
          }}>{"polypharmacy"}</span><span style={{
            fontSize: "calc(20pt * var(--pptx-font-scale, 1))",
            fontFamily: "'Times New Roman', Times, serif",
            color: "#000000"
          }}>{" patients."}</span></p></div><div key={1} style={{
        position: "absolute",
        left: "56px",
        top: "1.48px",
        width: "864px",
        height: "120px",
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
          }}>{"INTRODUCTION"}</span></p></div></div></div>;
};
export default Slide2;
