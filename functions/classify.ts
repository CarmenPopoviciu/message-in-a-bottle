import * as toxicity from '@tensorflow-models/toxicity';
import * as tf from '@tensorflow/tfjs-core';

export type ModelClassification = { text: string; } & {
  [key: string]: boolean | null;
}

export type ClassificationResult = {
  labels: string[];
  results: ModelClassification[];
}

let tfjsModel;
let labels: string[];

export async function onRequest(context) {
  const { request } = context;
  const { text } = await request.json();

  /**
   * GPU seems to be enabled by default, and since we can't run webGL 
   * inside a Worker, make sure we switch to CPU
   */
  if(tf.getBackend() !== 'cpu') {
    tf.setBackend('cpu');
  }

  /**
   * Loading the Tensorflow model is expensive, and ideally we want to 
   * load it once, not on every request. Using naive workaround for now.
   */
  if(!tfjsModel) {
    console.log("⏳ Loading model...");
    try{
      tfjsModel = await toxicity.load();
      console.log("Model load complete", tfjsModel);
      labels = tfjsModel.model.outputNodes.map((d) => d.split('/')[0]);
      console.log(`Extracted labels: ${labels}`);
    } catch(err) {
      console.log("Error", err);
      return new Response(err)
    }
  }
  /**
   * Since Workers don't support `performance.now()` this seems to be
   * the best way to measure the classification elapsed time. It would
   * have been helpful to provide this metric to the client, so we can
   * differentiate between the elapsed time of the request + classification 
   * and just the classification alone, in one place. Unfortunately that's 
   * not possible with `console.timeEnd()`, so for now we'll just have to 
   * do with what we have ¯\_(ツ)_/¯ 
   */
  console.time('🕒 Classification elapsed time');
  const results = await classify([text]);
  console.timeEnd('🕒 Classification elapsed time');
  /** */

  return new Response(
    JSON.stringify({ labels, results }),
    { headers: { 'Content-type': 'application/json' } });
}

/**
 * Classifies the toxicity of the given input
 */
async function classify(inputs: string[]): Promise<ModelClassification[]> {
  console.log(`🕵️  Classifying "${inputs}" ...`);
  const results = await tfjsModel.classify(inputs);

  return inputs.map((d, i) => {
    const obj = { text: d };

    results.forEach((classification) => {
      obj[classification.label] = classification.results[i].match;
    });

    return obj as ModelClassification;
  });
}