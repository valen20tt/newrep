import React, { useCallback, useRef, useEffect, useMemo } from 'react';
import ReactFlow, {
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  MarkerType,
  Panel,
  useReactFlow,
  getRectOfNodes,
  Position,
  Handle
} from 'reactflow';
import { toPng } from 'html-to-image'; 
import jsPDF from 'jspdf';
import { Download, Maximize, ZoomIn, ZoomOut } from 'lucide-react';
import 'reactflow/dist/style.css';
import { ReactFlowProvider } from 'reactflow';
import { ConnectionLineType } from 'reactflow';

// --- DIMENSIONES ---
const NODE_WIDTH = 220; 
const NODE_HEIGHT = 70; 
const COLUMN_GAP = 200; 
const ROW_GAP = 100;    
const HEADER_HEIGHT = 150; // Espacio extra arriba para los títulos

// --- COLORES ---
const COLORS = {
    DEFAULT: '#94a3b8',
    ENGLISH: '#8b5cf6',
    MATH: '#f59e0b',
    SYSTEMS: '#dc2626',
    MANAGEMENT: '#d97706',
    RESEARCH: '#be185d',
    NETWORKS: '#2563eb',
    HUMANITIES: '#10b981',
    NODE_YELLOW_BG: '#fde047', 
    NODE_YELLOW_BORDER: '#eab308',
    NODE_WHITE_BG: '#ffffff',
    NODE_BORDER: '#475569'
};

const ROMANOS_A_NUMEROS = {
  "I": 1, "II": 2, "III": 3, "IV": 4, "V": 5,
  "VI": 6, "VII": 7, "VIII": 8, "IX": 9, "X": 10,
  "XI": 11, "XII": 12
};

// Array inverso para generar los títulos
const NUMEROS_A_ROMANOS = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

// --- LÓGICA DE COLORES ---
const getCategoryColor = (nombreCurso) => {
    if (!nombreCurso) return COLORS.DEFAULT;
    const txt = nombreCurso.toUpperCase();
    if (txt.includes("MATEMATICA") || txt.includes("CALCULO") || txt.includes("FISICA") || txt.includes("ESTADISTICA") || txt.includes("ECUACIONES") || txt.includes("ALGEBRA") || txt.includes("QUIMICA")) return COLORS.MATH;
    if (txt.includes("INGLES") || txt.includes("LENGUAJE") || txt.includes("COMUNICACION")) return COLORS.ENGLISH;
    if (txt.includes("REDES") || txt.includes("ELECTRONICA") || txt.includes("ARQUITECTURA DE COMP") || txt.includes("ROUTERS") || txt.includes("CABLEADO") || txt.includes("ROBOTICA") || txt.includes("ARDUINO")) return COLORS.NETWORKS;
    if (txt.includes("TESIS") || txt.includes("METODOLOGIA") || txt.includes("INVESTIGACION") || txt.includes("PROYECTO DE TESIS")) return COLORS.RESEARCH;
    if (txt.includes("GESTION") || txt.includes("ADMINISTRACION") || txt.includes("PROYECTOS") || txt.includes("EMPRESARIAL") || txt.includes("CONTABLE") || txt.includes("FINANCIERA") || txt.includes("ECONOMIA") || txt.includes("LIDERAZGO")) return COLORS.MANAGEMENT;
    if (txt.includes("AMBIENTE") || txt.includes("SOCIOLOGIA") || txt.includes("FILOSOFIA") || txt.includes("ETICA") || txt.includes("REALIDAD") || txt.includes("CULTURALES")) return COLORS.HUMANITIES;
    if (txt.includes("PROGRAMACION") || txt.includes("SISTEMAS") || txt.includes("SOFTWARE") || txt.includes("DATOS") || txt.includes("ALGORITMOS") || txt.includes("INTELIGENCIA") || txt.includes("WEB")) return COLORS.SYSTEMS;
    return COLORS.DEFAULT;
};

const esCursoAmarillo = (nombreCurso) => {
  if (!nombreCurso) return false;
  const texto = nombreCurso.toUpperCase();
  const palabrasClave = ["ASISTENTE", "ELECTIVO", "ROBOTICA", "ARDUINO", "PMBOK", "CABLEADO", "ROUTERS", "DATA BASE", "SQL", "RUP", "UML", "INTELIGENTES", "WEB Y MOVILES"];
  return palabrasClave.some(palabra => texto.includes(palabra));
};

// --- COMPONENTE DE NODO PERSONALIZADO ---
const CursoNode = ({ data }) => {
    const esAmarillo = esCursoAmarillo(data.nombreCompleto);
    
    return (
        <div style={{
            display: 'flex',
            width: `${NODE_WIDTH}px`,
            height: `${NODE_HEIGHT}px`,
            border: esAmarillo ? `2px solid ${COLORS.NODE_YELLOW_BORDER}` : `1px solid ${COLORS.NODE_BORDER}`,
            borderRadius: '4px',
            background: esAmarillo ? COLORS.NODE_YELLOW_BG : COLORS.NODE_WHITE_BG,
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
            overflow: 'hidden',
            fontSize: '10px',
            fontFamily: 'Arial, sans-serif',
            position: 'relative',
            zIndex: 1001 
        }}>
            <Handle type="target" position={Position.Left} style={{ background: 'transparent', border: 'none' }} />
            
            {/* SECCIÓN CRÉDITOS */}
            <div style={{
                width: '32px', 
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                borderRight: esAmarillo ? `1px solid ${COLORS.NODE_YELLOW_BORDER}` : `1px solid ${COLORS.NODE_BORDER}`,
                background: 'rgba(0,0,0,0.05)', color: '#333', lineHeight: '1'
            }}>
                <span style={{ fontSize: '8px', marginBottom: '2px', fontWeight: '600' }}>Cr.</span>
                <span style={{ fontSize: '13px', fontWeight: 'bold' }}>{data.creditos}</span>
            </div>
            
            {/* SECCIÓN NOMBRE */}
            <div style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4px',
                textAlign: 'center', lineHeight: '1.2'
            }}>
                <div style={{ fontWeight: 'bold', color: '#000', marginBottom: '2px', fontSize: '10px' }}>
                    {data.codigo}
                </div>
                <div style={{ color: '#333', textTransform: 'uppercase', fontSize: '9px', fontWeight: '600' }}>
                    {data.nombreCompleto}
                </div>
            </div>

            <Handle type="source" position={Position.Right} style={{ background: 'transparent', border: 'none' }} />
        </div>
    );
};

// --- LÓGICA DE LAYOUT ---
const parsearCiclo = (rawCiclo) => {
    if (!rawCiclo) return 1;
    if (typeof rawCiclo === 'string') {
        const key = rawCiclo.trim().toUpperCase();
        if (ROMANOS_A_NUMEROS[key]) return ROMANOS_A_NUMEROS[key];
        if (!isNaN(parseInt(key))) return parseInt(key);
    } else if (typeof rawCiclo === 'number') return rawCiclo;
    return 1;
};

const corregirCiclo = (nombreCurso, cicloOriginal) => {
    if (cicloOriginal > 1) return cicloOriginal;
    const nombre = nombreCurso.toUpperCase();
    if (nombre.includes("ELECTIVO") || nombre.includes("ROBOTICA") || nombre.includes("ARDUINO")) return 6; 
    if (nombre.includes("ASISTENTE")) return 5; 
    if (nombre.includes("PROYECTOS DE TI")) return 9;
    if (nombre.includes("TESIS")) return 9;
    if (nombre.includes("PRACTICAS")) return 10;
    return cicloOriginal;
};

function getTransformForBounds(bounds, width, height, minZoom, maxZoom) {
  const xZoom = width / (bounds.width + 100);
  const yZoom = height / (bounds.height + 100);
  const zoom = Math.min(Math.min(xZoom, yZoom), maxZoom);
  const clampedZoom = Math.max(zoom, minZoom);
  const x = -bounds.x * clampedZoom + (width - bounds.width * clampedZoom) / 2;
  const y = -bounds.y * clampedZoom + (height - bounds.height * clampedZoom) / 2;
  return [x, y, clampedZoom];
}

const getCurriculumLayout = (nodes, edges) => {
  const ciclos = {};
  
  // 1. Agrupar nodos por ciclo
  nodes.forEach(node => {
    // Si es un nodo de título o decoración, lo ignoramos en la agrupación automática
    if (node.type === 'default' || node.type === 'output') return;

    let cicloNum = parsearCiclo(node.data.ciclo);
    cicloNum = corregirCiclo(node.data.nombreCompleto, cicloNum);
    if (!ciclos[cicloNum]) ciclos[cicloNum] = [];
    ciclos[cicloNum].push(node);
  });

  const layoutedNodes = [];
  let maxCiclo = 0;

  // 2. Posicionar Cursos
  Object.keys(ciclos).forEach((cicloKey) => {
    const cicloNum = parseInt(cicloKey);
    if (cicloNum > maxCiclo) maxCiclo = cicloNum;

    const cursosEnCiclo = ciclos[cicloKey];
    cursosEnCiclo.sort((a, b) => a.data.nombreCompleto.localeCompare(b.data.nombreCompleto));

    cursosEnCiclo.forEach((node, index) => {
      node.position = {
        x: (cicloNum - 1) * (NODE_WIDTH + COLUMN_GAP), 
        y: (index * (NODE_HEIGHT + ROW_GAP)) + HEADER_HEIGHT, // Bajamos todo por el Header
      };
      layoutedNodes.push(node);
    });
  });

  // 3. AGREGAR ENCABEZADOS DE CICLO ("I CICLO", "II CICLO"...)
  for (let i = 1; i <= Math.max(10, maxCiclo); i++) {
      layoutedNodes.push({
          id: `header-ciclo-${i}`,
          type: 'default', // Nodo simple de texto
          data: { label: `${NUMEROS_A_ROMANOS[i]} CICLO` },
          position: { 
              x: (i - 1) * (NODE_WIDTH + COLUMN_GAP), 
              y: HEADER_HEIGHT - 60 // Un poco arriba de los cursos
          },
          draggable: false,
          style: {
              width: NODE_WIDTH,
              border: 'none',
              background: 'transparent',
              fontWeight: 'bold',
              fontSize: '14px',
              textAlign: 'center',
              color: '#334155',
              boxShadow: 'none',
              zIndex: 0
          }
      });
  }

  // 4. AGREGAR TÍTULO PRINCIPAL
  const totalWidth = ((Math.max(10, maxCiclo)) * (NODE_WIDTH + COLUMN_GAP)) - COLUMN_GAP;
  layoutedNodes.push({
      id: 'main-title',
      type: 'default',
      data: { label: 'MALLA CURRICULAR DE INGENIERÍA DE SISTEMAS' },
      position: { 
          x: (totalWidth / 2) - 300, // Centrado aproximado
          y: 0 // Arriba del todo
      },
      draggable: false,
      style: {
          width: 600, // Ancho suficiente para el título
          border: 'none',
          background: 'transparent',
          fontFamily: 'Arial, sans-serif',
          fontWeight: '900',
          fontSize: '24px',
          textAlign: 'center',
          color: '#0f172a',
          fontStyle: 'italic', // Como en la imagen
          boxShadow: 'none',
          zIndex: 2000
      }
  });

  return { nodes: layoutedNodes, edges };
};

// --- COMPONENTE PRINCIPAL ---
function MapaPrerrequisitos({ allCourses, coursesWithPrereqs }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const { getNodes, fitView, zoomIn, zoomOut } = useReactFlow();

  const nodeTypes = useMemo(() => ({ cursoNode: CursoNode }), []);

  useEffect(() => {
    if (allCourses.length === 0) return;

    const courseMap = {};
    allCourses.forEach(c => { courseMap[c.id_curso] = c; });

    const rawNodes = allCourses.map((curso) => ({
      id: curso.id_curso.toString(),
      type: 'cursoNode', 
      data: { 
        codigo: curso.codigo_curso,
        nombreCompleto: curso.nombre_curso, 
        ciclo: curso.ciclo,
        creditos: curso.creditos || 0 
      },
      position: { x: 0, y: 0 },
      style: { zIndex: 1001 } 
    }));

    const rawEdges = [];
    coursesWithPrereqs.forEach((curso) => {
      curso.prerrequisitos.forEach((req) => {
        const sourceCourse = courseMap[req.id_curso_requerido];
        let edgeColor = COLORS.DEFAULT;
        if (sourceCourse) edgeColor = getCategoryColor(sourceCourse.nombre_curso);

        rawEdges.push({
          id: `e${req.id_curso_requerido}-${curso.curso_id}`,
          source: req.id_curso_requerido.toString(),
          target: curso.curso_id.toString(),
          type: 'step', 
          style: { stroke: edgeColor, strokeWidth: 2, zIndex: 0 }, 
          markerEnd: { type: MarkerType.ArrowClosed, color: edgeColor },
          zIndex: 0
        });
      });
    });

    const layout = getCurriculumLayout(rawNodes, rawEdges);
    setNodes(layout.nodes);
    setEdges(layout.edges);

  }, [allCourses, coursesWithPrereqs, setNodes, setEdges]);

  const downloadPdf = useCallback(() => {
    const viewport = document.querySelector('.react-flow__viewport');
    const nodesBounds = getRectOfNodes(getNodes());
    if (!viewport || nodesBounds.width === 0) return;

    const imageWidth = nodesBounds.width + 100;
    const imageHeight = nodesBounds.height + 100;
    const transform = getTransformForBounds(nodesBounds, imageWidth, imageHeight, 0.5, 2);

    toPng(document.querySelector('.react-flow__viewport'), {
      backgroundColor: '#ffffff',
      width: imageWidth,
      height: imageHeight,
      style: {
        width: imageWidth,
        height: imageHeight,
        transform: `translate(${transform[0]}px, ${transform[1]}px) scale(${transform[2]})`,
      },
    }).then((dataUrl) => {
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [imageWidth, imageHeight] });
      pdf.addImage(dataUrl, 'PNG', 0, 0, imageWidth, imageHeight);
      pdf.save('malla-curricular.pdf');
    }).catch((err) => console.error("Error exportando:", err));
  }, [getNodes]);

  return (
    <div className="map-wrapper" style={{ width: '100%', height: '88vh', background: '#ffffff' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.05}
        attributionPosition="bottom-right"
        connectionLineType={ConnectionLineType.Step} 
      >
        <Controls showInteractive={false} /> 
        <Background variant="dots" gap={80} size={1} color="#e2e8f0" />
        
        <Panel position="top-right" style={{ display: 'flex', gap: '10px', padding: '10px' }}>
             <div style={{ display: 'flex', background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <button title="Acercar" onClick={() => zoomIn({ duration: 300 })} style={btnStyle}><ZoomIn size={18}/></button>
                <button title="Alejar" onClick={() => zoomOut({ duration: 300 })} style={btnStyle}><ZoomOut size={18}/></button>
                <button title="Ver Todo" onClick={() => fitView({ duration: 800, padding: 0.1 })} style={btnStyle}><Maximize size={18}/></button>
             </div>

            <button 
                onClick={downloadPdf} 
                style={{ ...btnStyle, background: '#1e293b', color: 'white', padding: '8px 16px', borderRadius: '8px', width: 'auto', gap: '8px' }}
            >
                <Download size={18} /> Descargar PDF
            </button>
        </Panel>
      </ReactFlow>
    </div>
  );
}

const btnStyle = {
    display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px',
    border: 'none', borderRight: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', color: '#475569', transition: 'all 0.2s'
};

export default function MapaWrapper(props) {
    return (
        <ReactFlowProvider>
            <MapaPrerrequisitos {...props} />
        </ReactFlowProvider>
    );
}