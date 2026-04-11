import Graph from "graphology";
import Sigma from "sigma";
import { Octokit, App } from "octokit";

// get graph JSON from:
// https://github.com/Deanosaur666/npm-test-site/blob/graph.json
// using github API

const octokit = new Octokit();

async function loadGraph() {

    // API request
    let result = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
        owner: 'Deanosaur666',
        repo: 'npm-test-site',
        path: 'graph.json',
    })

    // Decode Base64 content to text
    let decodedContent = atob(result.data.content);
    
    // Parse the text as JSON
    let graphData = JSON.parse(decodedContent);
    
    return graphData;
    
}

let graph_json = await loadGraph()

console.log("Graph: ")
console.log(graph_json)

let graph = new Graph();

let edges = []

for (let i = 0; i < graph_json.length; i++) {
    let node = graph_json[i];
    graph.addNode(node.id, node);
    for (let j = 0; j < node.edges.length; j ++) {
        let target = node.edges[j]
        let edge = [node.id, target]
        edges.push([node.id, target])
    }
}

for (let i = 0; i < edges.length; i ++) {
    graph.addEdge(edges[i][0], edges[i][1])
}

const renderer = new Sigma(graph, document.getElementById("container"));

function addNodeButton() {

}

function removeNodeButton() {

}

function saveButton() {

}