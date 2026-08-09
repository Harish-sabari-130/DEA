import React, { useState, useEffect, useRef } from "react";
import img_bg from "./assets/images/image_4.jpg";
const Slide3: React.FC = () => {
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
  return <div id="slide-3" ref={outerRef} className="w-screen h-screen overflow-hidden relative" style={{
    backgroundColor: "#000"
  }}><div id="slide-inner-3" style={{
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
        left: "56px",
        top: "131.2px",
        width: "889.07px",
        height: "200px",
        boxSizing: "border-box",
        backgroundColor: "transparent",
        padding: "4.8px 9.6px 4.8px 9.6px",
        wordWrap: "break-word"
      }}><p style={{
          textAlign: "justify",
          lineHeight: "1.8",
          fontSize: "calc(20pt * var(--pptx-font-scale, 1))",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            marginRight: "8px",
            fontSize: "16pt"
          }}>{"v"}</span><span style={{
            fontSize: "calc(20pt * var(--pptx-font-scale, 1))",
            fontFamily: "'Times New Roman', Times, serif",
            color: "#000000"
          }}>{"Clinical management of patients with multiple diseases often involves overlapping and actively conflicting medical guidelines"}</span><span style={{
            fontSize: "calc(20pt * var(--pptx-font-scale, 1))",
            fontFamily: "'Times New Roman', Times, serif",
            color: "#000000"
          }}>{"."}</span></p><p style={{
          textAlign: "justify",
          lineHeight: "1.8",
          fontSize: "calc(20pt * var(--pptx-font-scale, 1))",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            marginRight: "8px",
            fontSize: "16pt"
          }}>{"v"}</span><span style={{
            fontSize: "calc(20pt * var(--pptx-font-scale, 1))",
            fontFamily: "'Times New Roman', Times, serif",
            color: "#000000"
          }}>{"Current multi-agent medical AI systems attempt to resolve these complex conflicts using probabilistic language consensus or open-ended agent debate"}</span><span style={{
            fontSize: "calc(20pt * var(--pptx-font-scale, 1))",
            fontFamily: "'Times New Roman', Times, serif",
            color: "#000000"
          }}>{"."}</span></p><p style={{
          textAlign: "justify",
          lineHeight: "1.8",
          fontSize: "calc(20pt * var(--pptx-font-scale, 1))",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            marginRight: "8px",
            fontSize: "16pt"
          }}>{"v"}</span><span style={{
            fontSize: "calc(20pt * var(--pptx-font-scale, 1))",
            fontFamily: "'Times New Roman', Times, serif",
            color: "#000000"
          }}>{"These existing architectures lack a deterministic, algorithmically enforced safety mechanism to prioritize evidence based on established clinical hierarchy"}</span><span style={{
            fontSize: "calc(20pt * var(--pptx-font-scale, 1))",
            fontFamily: "'Times New Roman', Times, serif",
            color: "#000000"
          }}>{"."}</span></p><p style={{
          textAlign: "justify",
          lineHeight: "1.8",
          fontSize: "calc(20pt * var(--pptx-font-scale, 1))",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            marginRight: "8px",
            fontSize: "16pt"
          }}>{"v"}</span><span style={{
            fontSize: "calc(20pt * var(--pptx-font-scale, 1))",
            fontFamily: "'Times New Roman', Times, serif",
            color: "#000000"
          }}>{"As a result, these systems can generate unsafe, hallucinated treatment plans that risk severe drug-disease contraindications."}</span></p></div><div key={1} style={{
        position: "absolute",
        left: "56px",
        top: "-18.5px",
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
          }}>{"PROBLEM STATEMENT"}</span></p></div></div></div>;
};
export default Slide3;
