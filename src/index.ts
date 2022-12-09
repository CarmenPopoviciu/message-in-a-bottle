/**
 * @license
 * Copyright 2019 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */

import { ClassificationResult } from "../functions/classify";

enum MESSAGES {
  YAY = "Positive vibes received ✨🌟✨! Passing forward to the rest of the world 💛",
  NAY = "How about sending a more positive vibe to the world? 🧡",
}

const inputEl = document.getElementById("classify-input") as HTMLInputElement;
const classifyBtn = document.getElementById("classify-btn") as HTMLButtonElement;
const messageEl = document.getElementsByClassName("message")[0] as HTMLDivElement;
const elapsedTimeEl = document.getElementsByClassName("crr-elapsed-time")[0] as HTMLDivElement;
const averageTimeEl = document.getElementsByClassName("average-elapsed-time")[0] as HTMLDivElement;

let model;
let labels: string[];
let totalClassificationExecutionTime = 0;
let iterations = 0;


classifyBtn.addEventListener("click", analyzeMessage);
inputEl.addEventListener("keyup", (ev: KeyboardEvent) => {
  if(ev.key === 'Enter') {
    analyzeMessage();
  }
});

async function analyzeMessage() {
  const text = inputEl?.value;

  /** 
   * Measure how long it takes to get a prediction back from the 
   * classifier (incl. the XHR request round trip). This will 
   * allow us to compare the performance of different implementations
   */
  const start = performance.now();
  const { labels, results } = await classify(text);
  const end = performance.now();
  /** */

  let containsToxicSentiments = false;

  for(let i=0; i< results.length; i++) {
    let classification = results[i];

    for(let j=0; j<labels.length; j++) {
      let label = labels[j];

      // if it's not strictly false then it's toxic
      if(classification[label] !== false) {
        containsToxicSentiments = true;
        break;
      }
    }
  }

  const message = containsToxicSentiments ? MESSAGES.NAY : MESSAGES.YAY;
  messageEl.textContent = message;

  const crrElapsedTime = end - start;
  elapsedTimeEl.textContent = `Classification elapsed time: ${crrElapsedTime}ms`;

  totalClassificationExecutionTime += crrElapsedTime;
  iterations += 1;
  averageTimeEl.textContent = `Avg. classification time: ${totalClassificationExecutionTime / iterations}ms`;
}

async function classify(text: string): Promise<ClassificationResult> {
  const response = await fetch('/classify', {
    method: 'POST',
    body: JSON.stringify({ text }),
    headers: { 'Content-type': 'application/json' }
  });
  return await response.json();
}
