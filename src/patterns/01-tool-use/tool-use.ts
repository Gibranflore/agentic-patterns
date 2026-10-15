/**
 * PATRÓN: Uso de herramientas - Tool use
 * ---------------------------
 * El catálogo de cursos NO está en el entrenamiento
 * del modelo. Sin herramientas, el modelo inventa precios y cursos con
 * total confianza o en su defecto, no hace nada.
 * Con herramientas, consulta el dato real.
 */

import { generateText, tool, stepCountIs } from 'ai';
import { z } from 'zod';
import { createTracer, model } from '../../helpers/index.js';

// ---------------------------------------------------------------------------
//  LA "BASE DE DATOS" — datos que el modelo no puede conocer
// ---------------------------------------------------------------------------

type Course = {
  id: string;
  title: string;
  hours: number;
  priceUSD: number;
  level: 'basic' | 'intermediate' | 'advanced';
  students: number;
};

const COURSE_CATALOG: Course[] = [
  {
    id: 'ts-01',
    title: 'TypeScript desde cero',
    hours: 22,
    priceUSD: 19.99,
    level: 'basic',
    students: 48_120,
  },
  {
    id: 'nest-02',
    title: 'NestJS: API REST modular',
    hours: 31,
    priceUSD: 24.99,
    level: 'intermediate',
    students: 22_450,
  },
  {
    id: 'flu-03',
    title: 'Flutter: apps multiplataforma',
    hours: 46,
    priceUSD: 29.99,
    level: 'intermediate',
    students: 61_300,
  },
  {
    id: 'agt-04',
    title: 'Agentes de IA con TypeScript',
    hours: 18,
    priceUSD: 34.99,
    level: 'advanced',
    students: 1_890,
  },
  {
    id: 'dkr-05',
    title: 'Docker para desarrolladores',
    hours: 14,
    priceUSD: 17.99,
    level: 'basic',
    students: 35_770,
  },
];

const QUESTION = "¿Cuánto costarían juntos el curso de TypeScript y el de Docker " +
"con un 20% de descuento? Dame también las horas totales"

//Todo === implemeantar el patron TOOl USE

//== tool find courses
const findCourses = tool({
    description: 'Buscar en el catalogo de detalles, por testo,' +
    'en el titulo por nivel, utiliza siempre antes de responser' +
    'cualquier pregunta sobre cursos, precios, cantidad de alumnos',
    inputSchema: z.object({
        text: 
            z.string()
            .optional()
            .describe("tesxto a buscar el titulo de curso"),
        level: z
        .enum(['basic' , 'intermediate' , 'advanced']).optional(),
    }),
    execute: async ({level, text}) => {
        const filteredCourses = COURSE_CATALOG.filter((course) => {
            const matchText = !text || course.title.toLocaleLowerCase().includes(text.toLocaleLowerCase())
            const matchLevel = !level || course.level === level;

            return matchText && matchLevel;
        })

        return {
            found: filteredCourses.length,
            courses: filteredCourses,
        }
    }
});
    const calculateTotal = tool({
        description:
            "Calcula el precio total de una lista de cursos aplicando un desucento porcentual." +
            "Utiliza siempre para cualquier operacion aritmetica: no calcules mentalemente",
        inputSchema: z.object({
            ids: z.array(z.string().describe('IDs de los cursos. ej: ["ts-01","dkr-052"]')),
            discountPercent: z.number().min(0).max(100).default(0)
        }),
        execute: async({ids, discountPercent}) => {
            const foundCourses = COURSE_CATALOG.filter((course) => ids.includes(course.id))

            const notFound = ids.filter(
                (id) => !COURSE_CATALOG.some(course => course.id == id)
            );

            const subtotal = foundCourses.reduce(
                (acc, course) => acc + course.priceUSD, 0
            );

            const discount = subtotal * (discountPercent / 100);

            return {
                subtotal: Number(subtotal.toFixed(2)),
                distotal: Number(discount.toFixed(2)),
                total: Number((subtotal - discount).toFixed(2)),
                notFound: notFound
            }
        }
    });


    async function whitTools() {

        const tracer = createTracer("con-herramientas");

        const { text } = await generateText({
            model,
            prompt: QUESTION,
            tools: {findCourses,calculateTotal},

            stopWhen: stepCountIs(6),
            instructions: 'Eres un asistente que recomiendas cursos de udemy detalles'+
            "No inventes precios, duraciones ni nombres de cursos"+
            " consultalos siempre con las herrminetas disponibles",
            onStepEnd: tracer.onStepFinish
        });
        console.log('\n Respuesta:', text.green);
        console.log('\n Verificar los números contra el catálogo de cursos');

        return tracer.summary()
    }

export async function toolUseMain() {

    // const resultA = await whitTools()
    const resultB = await whitTools()


console.log('\n === comparativa ===');
console.table({
    // "Sin herramientas": resultA,
    "Con herramientas": resultB,
})




}