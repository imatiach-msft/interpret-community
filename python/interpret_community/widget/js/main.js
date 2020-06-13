import React from 'react';
import ReactDOM from 'react-dom';

import { ExplanationDashboard } from 'interpret-dashboard';

const RenderDashboard = (divId, data) => {
  let generatePrediction = (postData) => {
    var headers_data = {}
    //data.origin !== undefined
    headers_data = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
    fetch('https://nbvm-5000.eastus2.instances.azureml.net/', {method: "get", headers: headers_data, credentials: 'include', mode: 'cors'}).then(resp => {
    // return fetch(data.predictionUrl, {method: "get", body: JSON.stringify(postData), headers: headers_data, mode: 'cors'}).then(resp => {
    return fetch(data.predictionUrl, {method: "get", headers: headers_data, credentials: 'include', mode: 'cors'}).then(resp => {
      if (resp.status >= 200 && resp.status < 300) {
        return resp.json()
      }
      return Promise.reject(new Error(resp.statusText))
    }).then(json => {
      if (json.error !== undefined) {
        throw new Error(json.error)
      }
      return Promise.resolve(json.data)
    })
  })
  }

  ReactDOM.render(<ExplanationDashboard
      modelInformation={{modelClass: 'blackbox'}}
      dataSummary={{featureNames: data.featureNames, classNames: data.classNames}}
      testData={data.trainingData}
      predictedY={data.predictedY}
      probabilityY={data.probabilityY}
      trueY={data.trueY}
      precomputedExplanations={{
        localFeatureImportance: data.localExplanations,
        globalFeatureImportance: data.globalExplanation,
        ebmGlobalExplanation: data.ebmData
      }}
      requestPredictions={data.predictionUrl !== undefined ? generatePrediction : undefined}
      locale={data.locale}
      key={new Date()}
    />, document.getElementById(divId));
}
  
export { RenderDashboard, ExplanationDashboard };
