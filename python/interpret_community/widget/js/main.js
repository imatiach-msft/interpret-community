import React from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';

import { ExplanationDashboard } from 'interpret-dashboard';

const RenderDashboard = (divId, data) => {
  let generatePrediction = (postData) => {
    //data.origin !== undefined
    var headers_data = {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
        'Content-Type': 'application/json',
    }
    const instance = axios.create({headers: headers_data, withCredentials: true, baseURL: data.predictionUrl})
    instance.post({data: JSON.stringify(postData)})
    .then((response) => {
        return response.data
    })
    .catch(function (error) {
        throw new Error(error)
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
