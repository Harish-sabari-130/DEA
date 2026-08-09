import React, { useState, useEffect, useRef } from "react";
import img_1 from "./assets/images/image_1.jpg";
import img_2 from "./assets/images/image_2.png";
import img_3 from "./assets/images/image_3.jpg";
import img_bg from "./assets/images/image_4.jpg";
const Slide1: React.FC = () => {
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
  return <div id="slide-1" ref={outerRef} className="w-screen h-screen overflow-hidden relative" style={{
    backgroundColor: "#000"
  }}><div id="slide-inner-1" style={{
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
        left: "160.28px",
        top: "146.61px",
        width: "740.54px",
        height: "168px",
        boxSizing: "border-box",
        backgroundColor: "transparent"
      }} /><div key={1} style={{
        position: "absolute",
        left: "206.28px",
        top: "363.94px",
        width: "672px",
        height: "305.32px",
        boxSizing: "border-box",
        backgroundColor: "transparent",
        padding: "4.8px 1.92px 4.8px 0px",
        wordWrap: "break-word"
      }}><p style={{
          textAlign: "center",
          lineHeight: "1.08",
          paddingRight: "4.8px",
          fontSize: "calc(18pt * var(--pptx-font-scale, 1))",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: "calc(18pt * var(--pptx-font-scale, 1))"
          }}>{"\xA0"}</span></p><p style={{
          textAlign: "center",
          lineHeight: "1.08",
          marginTop: "3.6pt",
          paddingRight: "4.8px",
          fontSize: "calc(18pt * var(--pptx-font-scale, 1))",
          marginBottom: "0"
        }}><span style={{
            fontSize: "calc(18pt * var(--pptx-font-scale, 1))",
            fontFamily: "'Times New Roman', Times, serif",
            fontWeight: "700",
            color: "#000000"
          }}>{"PROJECT GUIDE"}</span></p><p style={{
          textAlign: "center",
          lineHeight: "1.08",
          marginTop: "3.6pt",
          paddingRight: "4.8px",
          fontSize: "calc(18pt * var(--pptx-font-scale, 1))",
          marginBottom: "0"
        }}><span style={{
            fontSize: "calc(18pt * var(--pptx-font-scale, 1))",
            fontFamily: "'Times New Roman', Times, serif",
            color: "#FF0000"
          }}>{"M"}</span><span style={{
            fontSize: "calc(18pt * var(--pptx-font-scale, 1))",
            fontFamily: "'Times New Roman', Times, serif",
            color: "#FF0000"
          }}>{"r"}</span><span style={{
            fontSize: "calc(18pt * var(--pptx-font-scale, 1))",
            fontFamily: "'Times New Roman', Times, serif",
            color: "#FF0000"
          }}>{". "}</span><span style={{
            fontSize: "calc(18pt * var(--pptx-font-scale, 1))",
            fontFamily: "'Times New Roman', Times, serif",
            color: "#FF0000"
          }}>{"S. GOPINATH"}</span></p><p style={{
          textAlign: "center",
          lineHeight: "1.08",
          marginTop: "3.6pt",
          paddingRight: "4.8px",
          fontSize: "calc(18pt * var(--pptx-font-scale, 1))",
          marginBottom: "0"
        }}><span style={{
            fontSize: "calc(18pt * var(--pptx-font-scale, 1))",
            fontFamily: "'Times New Roman', Times, serif",
            color: "#FF0000"
          }}>{"ASSISTANT"}</span><span style={{
            fontSize: "calc(18pt * var(--pptx-font-scale, 1))",
            fontFamily: "'Times New Roman', Times, serif",
            color: "#FF0000"
          }}>{" "}</span><span style={{
            fontSize: "calc(18pt * var(--pptx-font-scale, 1))",
            fontFamily: "'Times New Roman', Times, serif",
            color: "#FF0000"
          }}>{"PROFESSOR "}</span></p><p style={{
          textAlign: "center",
          lineHeight: "1.08",
          marginTop: "3.6pt",
          paddingRight: "4.8px",
          fontSize: "calc(18pt * var(--pptx-font-scale, 1))",
          marginBottom: "0"
        }}><span style={{
            fontSize: "calc(18pt * var(--pptx-font-scale, 1))"
          }}>{"\xA0"}</span></p><p style={{
          textAlign: "center",
          lineHeight: "1.08",
          marginTop: "3.6pt",
          paddingRight: "4.8px",
          fontSize: "calc(18pt * var(--pptx-font-scale, 1))",
          marginBottom: "0"
        }}><span style={{
            fontSize: "calc(18pt * var(--pptx-font-scale, 1))",
            fontFamily: "'Times New Roman', Times, serif",
            fontWeight: "700",
            color: "#000000"
          }}>{"PROJECT MEMBER"}</span></p><p style={{
          textAlign: "center",
          lineHeight: "1.08",
          marginTop: "3.6pt",
          paddingRight: "4.8px",
          fontSize: "calc(18pt * var(--pptx-font-scale, 1))",
          marginBottom: "0"
        }}><span style={{
            fontSize: "calc(18pt * var(--pptx-font-scale, 1))",
            fontFamily: "'Times New Roman', Times, serif",
            color: "#FF0000"
          }}>{"DHARUNRAJ S"}</span><span style={{
            fontSize: "calc(18pt * var(--pptx-font-scale, 1))",
            fontFamily: "'Times New Roman', Times, serif",
            color: "#FF0000"
          }}>{" "}</span><span style={{
            fontSize: "calc(18pt * var(--pptx-font-scale, 1))",
            fontFamily: "'Times New Roman', Times, serif",
            color: "#FF0000"
          }}>{"\u2013 "}</span><span style={{
            fontSize: "calc(18pt * var(--pptx-font-scale, 1))",
            fontFamily: "'Times New Roman', Times, serif",
            color: "#FF0000"
          }}>{"23ALR019"}</span></p><p style={{
          textAlign: "center",
          lineHeight: "1.08",
          marginTop: "3.6pt",
          paddingRight: "4.8px",
          fontSize: "calc(18pt * var(--pptx-font-scale, 1))",
          marginBottom: "0"
        }}><span style={{
            fontSize: "calc(18pt * var(--pptx-font-scale, 1))",
            fontFamily: "'Times New Roman', Times, serif",
            color: "#FF0000"
          }}>{"HARIHARAN J\u2013 23ALR029"}</span></p><p style={{
          textAlign: "center",
          lineHeight: "1.08",
          marginTop: "3.6pt",
          paddingRight: "4.8px",
          fontSize: "calc(18pt * var(--pptx-font-scale, 1))",
          marginBottom: "0"
        }}><span style={{
            fontSize: "calc(18pt * var(--pptx-font-scale, 1))",
            fontFamily: "'Times New Roman', Times, serif",
            color: "#FF0000"
          }}>{"HARISH SABARI P V"}</span><span style={{
            fontSize: "calc(18pt * var(--pptx-font-scale, 1))",
            fontFamily: "'Times New Roman', Times, serif",
            color: "#FF0000"
          }}>{" "}</span><span style={{
            fontSize: "calc(18pt * var(--pptx-font-scale, 1))",
            fontFamily: "'Times New Roman', Times, serif",
            color: "#FF0000"
          }}>{"\u2013 "}</span><span style={{
            fontSize: "calc(18pt * var(--pptx-font-scale, 1))",
            fontFamily: "'Times New Roman', Times, serif",
            color: "#FF0000"
          }}>{"23ALR031"}</span></p></div><div key={2} style={{
        position: "absolute",
        left: "406.27px",
        top: "311.31px",
        width: "494.55px",
        height: "74.33px",
        boxSizing: "border-box",
        backgroundColor: "transparent",
        padding: "9.6px 9.6px 9.6px 9.6px",
        wordWrap: "break-word"
      }}><p style={{
          lineHeight: "1.2",
          fontSize: "calc(18pt * var(--pptx-font-scale, 1))",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: "calc(18pt * var(--pptx-font-scale, 1))",
            fontFamily: "'Times New Roman', Times, serif",
            fontWeight: "700",
            color: "#000000"
          }}>{"PROJECT REVIEW - 1 "}</span></p></div><div key={3} style={{
        position: "absolute",
        left: "244.11px",
        top: "12.78px",
        width: "703.03px",
        height: "87.24px",
        boxSizing: "border-box",
        backgroundColor: "transparent",
        padding: "4.8px 9.6px 4.8px 9.6px",
        wordWrap: "break-word"
      }}><p style={{
          textAlign: "center",
          lineHeight: "1.2",
          fontSize: "calc(24pt * var(--pptx-font-scale, 1))",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: "calc(24pt * var(--pptx-font-scale, 1))",
            fontFamily: "'Times New Roman', Times, serif",
            fontWeight: "700",
            color: "#000000"
          }}>{"DEPARTMENT OF ARTIFICIAL "}</span></p><p style={{
          textAlign: "center",
          lineHeight: "1.2",
          fontSize: "calc(24pt * var(--pptx-font-scale, 1))",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: "calc(24pt * var(--pptx-font-scale, 1))",
            fontFamily: "'Times New Roman', Times, serif",
            fontWeight: "700",
            color: "#000000"
          }}>{"INTELLIGENCE AND MACHINE LEARNING"}</span></p></div><img key={4} src={img_1} alt="object 3" style={{
        position: "absolute",
        left: "0px",
        top: "0px",
        width: "240px",
        height: "718.59px",
        boxSizing: "border-box",
        objectFit: "fill"
      }} /><img key={5} src={img_2} alt="kec2blackborder png.PNG" style={{
        position: "absolute",
        left: "11.79px",
        top: "476.73px",
        width: "155.28px",
        height: "193.32px",
        boxSizing: "border-box",
        objectFit: "fill"
      }} /><img key={6} src={img_3} alt="Picture 5" style={{
        position: "absolute",
        left: "12.86px",
        top: "10.35px",
        width: "156.8px",
        height: "73.17px",
        boxSizing: "border-box",
        objectFit: "fill"
      }} /><div key={7} style={{
        position: "absolute",
        left: "221.39px",
        top: "138.12px",
        width: "672px",
        height: "137.05px",
        boxSizing: "border-box",
        backgroundColor: "transparent",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        padding: "0px 1.92px 0px 0px",
        ["--pptx-font-scale"]: "0.625",
        wordWrap: "break-word"
      }}><p style={{
          textAlign: "center",
          lineHeight: "0.96",
          fontSize: "calc(37pt * var(--pptx-font-scale, 1))",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: "calc(37pt * var(--pptx-font-scale, 1))",
            fontFamily: "'Times New Roman', Times, serif",
            fontWeight: "700",
            color: "#FF0000"
          }}>{"Deterministic Epistemic Arbitration in Multi-Agent RAG: Resolving Guideline Collisions for "}</span><span style={{
            fontSize: "calc(37pt * var(--pptx-font-scale, 1))",
            fontFamily: "'Times New Roman', Times, serif",
            fontWeight: "700",
            color: "#FF0000"
          }}>{"Polypharmacy"}</span><span style={{
            fontSize: "calc(37pt * var(--pptx-font-scale, 1))",
            fontFamily: "'Times New Roman', Times, serif",
            fontWeight: "700",
            color: "#FF0000"
          }}>{" Decision "}</span><span style={{
            fontSize: "calc(37pt * var(--pptx-font-scale, 1))",
            fontFamily: "'Times New Roman', Times, serif",
            fontWeight: "700",
            color: "#FF0000"
          }}>{"Support"}</span></p><p style={{
          textAlign: "center",
          lineHeight: "0.96",
          fontSize: "calc(32pt * var(--pptx-font-scale, 1))",
          marginTop: "0",
          marginBottom: "0"
        }}><br /><span style={{
            fontSize: "calc(28pt * var(--pptx-font-scale, 1))",
            fontFamily: "'Times New Roman', Times, serif",
            color: "#000000"
          }}>{"SDG ("}</span><span style={{
            fontSize: "calc(28pt * var(--pptx-font-scale, 1))",
            fontFamily: "'Times New Roman', Times, serif",
            color: "#FF0000"
          }}>{"3"}</span><span style={{
            fontSize: "calc(28pt * var(--pptx-font-scale, 1))",
            fontFamily: "'Times New Roman', Times, serif",
            color: "#000000"
          }}>{") \u2013 Good health and well being"}</span></p></div></div></div>;
};
export default Slide1;
