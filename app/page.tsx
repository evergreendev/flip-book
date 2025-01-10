"use client"
import React, {useEffect, useRef, useState} from "react";
import HTMLFlipBook from "react-pageflip";
import {OPS, RenderTask} from "pdfjs-dist";

// eslint-disable-next-line react/display-name
const Page = React.forwardRef(({currPage}: { currPage: number }, ref: React.ForwardedRef<HTMLDivElement>) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const renderTaskRef = useRef<RenderTask>(null);

    useEffect(() => {
        let isCancelled = false;

        async function renderPage(canvas:  HTMLCanvasElement) {
            // Import pdfjs-dist dynamically for client-side rendering.
            // @ts-expect-error: TypeScript cannot verify dynamic import for pdfjs-dist.
            const pdfJS = await import('pdfjs-dist/build/pdf');

            // Set up the worker.
            pdfJS.GlobalWorkerOptions.workerSrc =
                window.location.origin + '/pdf.worker.min.mjs';

            // Load the PDF document.
            const pdf = await pdfJS.getDocument('test.pdf').promise;

            // Get the first page.
            const page = await pdf.getPage(currPage);
            const viewport = page.getViewport({scale: 1.5});

            // Prepare the canvas.
            const canvas1 = canvas;
            const canvasContext = canvas1.getContext('2d');
            canvas1.height = viewport.height;
            canvas1.width = viewport.width;

            // Ensure no other render tasks are running.
            if (renderTaskRef.current) {
                await renderTaskRef.current.promise;
            }

            // Render the page into the canvas.
            const renderContext = {canvasContext, viewport};
            const renderTask = page.render(renderContext);

            // Store the render task.
            renderTaskRef.current = renderTask;

            // Wait for rendering to finish.
            try {
                await renderTask.promise;
            } catch (error) {
                // @ts-expect-error Don't need to know the error type
                if (error.name === 'RenderingCancelledException') {
                    console.log('Rendering cancelled.');
                } else {
                    console.error('Render error:', error);
                }
            }

            function convertToCanvasCoords([x, y, width, height]:[number, number, number, number]) {
                const scale = 1.5;
                return [x * scale, canvas.height - ((y + height) * scale), width * scale, height * scale];
            }

            if(canvasContext){
                const structureTree = await page.getTextContent();

                //console.log(page);
/*                const operatorList = await page.getOperatorList();

                const imgIndex = operatorList.fnArray.indexOf(OPS.paintImageXObject);
                const imgArgs = operatorList.argsArray[imgIndex];
                const data = page.objs.get(imgArgs[0]);*/

                canvasContext.fillStyle = "orange";
                //canvasContext.fillRect(...convertToCanvasCoords([42.76, 45.388, 699, 467]))
/*                console.log(OPS);
                console.log(operatorList);

                console.log(page);
                console.log(data);*/


                structureTree.items.forEach((item: { transform: number[]; width: number; height: number; str:string }) => {

                    if (item.str.toLowerCase().includes(".com")||item.str.toLowerCase().includes(".edu")){
                        const transform = item.transform;
                        const x = transform[4];
                        const y = transform[5];
                        const width = item.width;
                        const height = item.height;
                        canvasContext.fillStyle = "orange";
                        // @ts-expect-error silly tuple nonsense
                        canvasContext.fillRect(...convertToCanvasCoords([x, y, width, height]))
                    }
                })
                //canvasContext.fillStyle = "orange";
                //canvasContext.fillRect(20, 50, canvas.width, canvas.height);
            }



            if (!isCancelled) {
                console.log('Rendering completed');
            }
        }

        (async function () {
            if (!canvasRef.current) return;
            await renderPage(canvasRef.current);

        })();

        // Cleanup function to cancel the render task if the component unmounts.
        return () => {
            isCancelled = true;
            if (renderTaskRef.current) {
                renderTaskRef.current.cancel();
            }
        };
    }, [currPage]);

    return (
        <div ref={ref}>
            <canvas ref={canvasRef}/>
        </div>

    );
});

export default function Home() {
    const [maxPage, setMaxPage] = useState(1);
/*    const [width, setWidth] = useState(0);
    const [height, setHeight] = useState(0);*/

    const renderTaskRef = useRef<RenderTask>(null);
    const book = useRef(null);

    useEffect(() => {
        let renderTask = null;
        if(renderTaskRef.current){
            renderTask = renderTaskRef.current;
        }
        (async function () {
            // Import pdfjs-dist dynamically for client-side rendering.
            // @ts-expect-error: TypeScript cannot verify dynamic import for pdfjs-dist.
            const pdfJS = await import('pdfjs-dist/build/pdf');

            // Set up the worker.
            pdfJS.GlobalWorkerOptions.workerSrc =
                window.location.origin + '/pdf.worker.min.mjs';

            // Load the PDF document.
            const pdf = await pdfJS.getDocument('test.pdf').promise;
            setMaxPage(pdf.numPages);
        })();

        // Cleanup function to cancel the render task if the component unmounts.
        return () => {
            if (renderTask) {
                renderTask.cancel();
            }
        };
    }, []);



    return <>
{/*        <button onClick={() =>
            book.current.pageFlip().flipNext()}>Next page
        </button>*/}

        {/* @ts-expect-error Ignore required attributes since they're not really required*/}
        <HTMLFlipBook ref={book} showCover={true} height={1100} width={950}>
            {Array.from({length: maxPage}).map((_, index) => (
                <Page key={index} currPage={index + 1}/>
            ))}
        </HTMLFlipBook>

    </>;
}
