import Graph from "graphology";
import Sigma from "sigma";
import circular from "graphology-layout/circular";
import forceAtlas2 from "graphology-layout-forceatlas2";
import { Octokit, App } from "octokit";
import { Buffer } from 'buffer';

// get graph JSON from:
// https://github.com/Deanosaur666/npm-test-site/blob/graph.json
// using github API

let octokit = new Octokit({
    userAgent : "Dean's npm test site"
});

let username = "";
let email = "";
const output = document.getElementById("output");
output.textContent = "Welcome";
const usernameField = document.getElementById("username");

usernameField.textContent = "USER: NONE"

async function ghAuth() {
    let authToken = document.getElementById("ghtoken").value;
    usernameField.textContent = "USER: NONE"
    username = "";
    if (!authToken) {
      output.textContent = 'Please enter a token';
      return;
    }

    // Re-instantiate Octokit with the user's token
    octokit = new Octokit({ auth: authToken });

    try {
      
        // Test authentication
        const { data } = await octokit.request('GET /user');
        username = data.login;
        output.textContent = `Logged in as: ${username}`;
        usernameField.textContent = `USER: ${username}`
        return true;
      
    }
    catch (error) {
        if (error.status === 401) {
            output.textContent = 'Invalid token';
        } else {
            output.textContent = 'Error: ' + error.message;
        }
        return false;
    }

}

let sha = ""
let graph_owner = "Deanosaur666";
let graph_repo = "npm-test-site";
let graph_path = "graph.json"

document.getElementById("ghtoken").value = "";
document.getElementById("authButton").addEventListener("click", ghAuth, false);
document.getElementById("addNodeButton").addEventListener("click", addNodeButton, false);
document.getElementById("removeNodeButton").addEventListener("click", removeNodeButton, false);
document.getElementById("uploadButton").addEventListener("click", uploadButton, false);
document.getElementById("reloadButton").addEventListener("click", reloadGraph, false);

async function loadGraph() {

    // API request
    let result = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
        owner: graph_owner,
        repo: graph_repo,
        path: graph_path,
    })
    
    sha = result.data.sha;

    // Decode Base64 content to text
    let decodedContent = atob(result.data.content);
    
    // Parse the text as JSON
    let graphData = JSON.parse(decodedContent);
    
    return graphData;
    
}

let graph_json = null;
let renderer = null;
await reloadGraph();

async function reloadGraph() {
    graph_json = await loadGraph()
    regenGraph(graph_json)
}

function regenGraph(graph_json) {
    let graph = new Graph({
        multi: true
    });

    if(renderer) {
        renderer.kill();
        renderer = null;
    }

    // Clear container
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }


    let edges = []

    for (let i = 0; i < graph_json.length; i++) {
        let node = graph_json[i];
        if(!Object.hasOwn(node, "label") || !node.label) {
            node.label = node.id;
        }
        node.forceLabel = true;

        graph.addNode(node.id, node);
        for (let j = 0; j < node.edges.length; j ++) {
            let target = node.edges[j]
            let edge = [node.id, target]
            edges.push([node.id, target])
        }
    }

    for (let i = 0; i < edges.length; i ++) {
        if(graph.hasNode(edges[i][0]) && graph.hasNode(edges[i][1]))
            graph.addEdge(edges[i][0], edges[i][1])
    }

    circular.assign(graph);
    const settings = forceAtlas2.inferSettings(graph);
    settings.gravity = 0.1;
    settings.scalingRatio = 10;
    forceAtlas2.assign(graph, { settings, iterations: 2});

    renderer = new Sigma(graph, document.getElementById("container"), {
        labelSize: 14,
        labelWeight: "bold",
        labelColor: { color: "red" },
    });
}

function addNodeButton() {
    let nodeID = document.getElementById("nodeIDInput").value;
    let nodeColor = document.getElementById("nodeColorInput").value;
    let nodeSize = document.getElementById("nodeSizeInput").value;
    let nodeEdges = document.getElementById("nodeEdgesInput").value.split(",").map(item => item.trim());

    if(nodeID && nodeColor && nodeSize) {
        

        let old_node = graph_json.find((e) => e.id == nodeID);

        if(old_node) {
            old_node.size = nodeSize;
            old_node.color = nodeColor;
            old_node.edges = nodeEdges;
        }
        else {
            let node = {
                "id" : nodeID,
                "size" : nodeSize,
                "color" : nodeColor,
                "edges" : nodeEdges
            };
            graph_json.push(node);
        }
        regenGraph(graph_json);
        output.textContent = "Node added.";
    }
    else {
        output.textContent = "Please input node ID, color, and size.";
    }
}

function removeNodeButton() {
    graph_json.pop();
    regenGraph(graph_json);
}

async function uploadButton() {
    if(!username) {
        output.innerText = "You must authenticate with a GitHub personal access token."
        return;
    }

    const content = Buffer.from(JSON.stringify(graph_json)).toString('base64');
    const fileContent = await octokit.rest.repos.createOrUpdateFileContents({
        owner: graph_owner,
        repo: graph_repo,
        path: graph_path,
        branch: "main",
        sha: sha,
        message: "Update graph from site UI",
        content,
    });

    const { commit: { html_url } } = fileContent.data;

    output.innerText = `Content updated, see changes at ${html_url}`;
}