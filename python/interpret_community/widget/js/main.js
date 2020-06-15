import React from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';

import { ExplanationDashboard } from 'interpret-dashboard';

function getCookieValue(a) {
    var b = document.cookie.match('(^|;)\\s*' + a + '\\s*=\\s*([^;]+)');
    return b ? b.pop() : '';
}

const RenderDashboard = (divId, data) => {
  let generatePrediction = (postData) => {
    var headers_data = {}
    //data.origin !== undefined
    var headers_data1 = {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
        'Content-Type': 'application/json',
    }
    var headers_data2 = {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
        'Content-Type': 'application/json',
        // 'X-XSRF-TOKEN': getCookieValue('XSRF-TOKEN')
    }
    const instance = axios.create({headers: headers_data1, withCredentials: true, baseURL: 'https://nbvm-5000.eastus2.instances.azureml.net/'})
    instance.get()
    request = new Request('https://nbvm.eastus2.instances.azureml.net/', {headers: headers_data1, credentials: 'include', method: "get", mode: 'cors'}).headers
    fetch(request).then(resp => {
        if (resp.status == 302) {
            let auth_cookie = resp.headers.get('Set-Cookie')
            var headers_data_auth = {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
                'Content-Type': 'application/json',
                'Cookie': auth_cookie
            }
            // do the login thing, setting Cookie from initial response
            return fetch("auth.eastus2.instances.azureml.net/signin-oidc2", {headers: headers_data_auth, credentials: 'include', method: "post", mode: 'cors'}).then(resp => {
                resp.headers.get('Set-Cookie')
            })
        } else if (resp.status >= 200 && resp.status < 300) {
            fetch(data.predictionUrl, {headers: headers_data2, credentials: 'include', method: "post", mode: 'cors', body: JSON.stringify(postData)}).then(resp => {
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
        }

    // return fetch(data.predictionUrl, {method: "get", body: JSON.stringify(postData), headers: headers_data, mode: 'cors'}).then(resp => {
    return fetch(data.predictionUrl, {headers: headers_data2, credentials: 'include', method: "post", mode: 'cors', body: JSON.stringify(postData)}).then(resp => {
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
