/*****************************************
 * collection-json module
 *****************************************/
 
// imports
const {JSONPath} = require('jsonpath-plus');
const Stack = require('stack-lifo');
const utils = require('../src/hyper-utils');

// exports
module.exports = {main, mediaType, withRel, withId, withForm};
 
// internals
var responses = new Stack();
var dataStack = new Stack();
var config = {};
 
// return media type
function mediaType() {
  return "application/vnd.collection+json";
}
 
function withRel(args) {
 var response = args.response;
 var thisWord = args.thisWord;
 var path = "";
 var rt = "";
 
 path = "$..*[?(@property==='rel'&&@.match(/"+thisWord+"/i))]^.href";
 
 try {
   rt = JSONPath({path:path,json:response})[0];
 } catch (err) {
   // no-op
 }
 return rt;
}

// support WITH-ID 
// soft support (items MAY have ids)
function withId(args) {
  var response = args.response;
  var thisWord = args.thisWord;
  var token = "";
  var rt = "";
   
  token = "$..*[?(@property==='id'&&@.match(/"+thisWord+"/i))]^.href"
  
  try {
    rt = JSONPath({path:token, json:response})[0];
  } catch (err){
    // no-op
    // console.log(err);
  }
  return rt; 
}

// support WITH-NAME
function withName(args) {
  // no support for name -> href in CJ
}

// support WITH-FORM
// defaults to queries in CJ 
// uses reserved words for templates
function withForm(args) {
  var response = args.response;
  var thisWord = args.thisWord
  var headers = args.headers;
  var method = args.method;
  var body = args.body;
  var fields = args.fields
  var fieldSet = args.fieldSet;
  var config = args.config;
  var url = args.url;
  var action, form;
  var path = "";
  
  if(thisWord.toUpperCase().indexOf("TEMPLATE")!==-1) {
    path = "$.collection.template";
  }
  else {
    path = "$.collection.queries.*[?(@property==='rel'&&@.match(/"+thisWord+"/i))]^";
  }  

  form = JSONPath({path:path, json:response})[0];
  
  try {
    switch (thisWord.toUpperCase()) {
      case "TEMPLATE":
      case "TEMPLATE-POST":
      case "TEMPLATE-CREATE":
      case "CREATE":
      case "TEMPLATE-PUT":
      case "TEMPLATE-UPDATE":
      case "UPDATE":
      case "TEMPLATE-DELETE":
      case "DELETE":
        url = response.collection.href;
        url = utils.fixUrl(url);
        break;
      default:        
        if(form && form.href) {
          url = form.href;  
          url = utils.fixUrl(url);
        }
        else {
          url = "#";
        }          
    }    
  } catch (err) {
    // no-op console.log(err);
  }
  
  try {
    switch (thisWord.toUpperCase()) {
      case "TEMPLATE":
      case "TEMPLATE-CREATE":
      case "CREATE":
        method = "POST";
        break;
      case "TEMPLATE-UPDATE":
      case "UPDATE":
        method = "PUT";
        break; 
      case "TEMPLATE-DELETE":
        method = "DELETE";
        break;
      default:
        if(form && form.method) {
          method = form.method;
        }
        else {
          method = "GET";
        }
    }
  } catch(err) {
    // no-op
  }  
  
  if(form && form.data) {
    fields = form.data; // we'll use these later
    fields.forEach(function dataField(f) {
      fieldSet[f.name] = "";
    });
  }
  if(form & form.type) {
    if(form.type!=="") {
      headers["content-type"] = form.type;
    } 
    else {
      headers["content-type"] = config["content-type"]||"application/json";
    }
  }
  return  {headers:headers, method:method, body:body, url:url, fields:fields, fieldSet:fieldSet}  
}
 
// display a parse CollectionJSON object
// CJ {command}
// args: {responses:responses,dataStack:dataStack,config:config,words:words}
function main(args) {
  config = args.config;
  responses = args.responses;
  dataStack = args.dataStack;  
  var words = args.words;
  var rt = {};
  var index = 0;
  var token = words[1]||"";
  var response;
  var thisWord = "";

  try {
    response = responses.peek();
  } catch {
    response = {};
  }
  
  switch (token.toUpperCase()) {
    case "HELP":
      rt = showHelp(words[2]||"");
      break;
    case "METADATA":
      rt = JSON.parse(response.getBody('UTF8')).collection.metadata||[];
      break;
   case "LINKS":
      rt = JSON.parse(response.getBody('UTF8')).collection.links;
      break;
    case "ITEMS":
      rt = JSON.parse(response.getBody('UTF8')).collection.items;
      break;
    case "QUERIES":
      rt = JSON.parse(response.getBody('UTF8')).collection.queries;
      break;
    case "TEMPLATE":
      rt = JSON.parse(response.getBody('UTF8')).collection.template;
      break;
    case "ERROR":
    case "ERRORS":
      rt = JSON.parse(response.getBody('UTF8')).collection.error||{};
      break;
    case "RELATED":
      rt = JSON.parse(response.getBody('UTF8')).collection.related||{};
      break;
    case "HREF":
      rt = JSON.parse(response.getBody('UTF8')).collection.href||{};
      break;  
    case "REL":
    case "ID":
    case "NAME":
      thisWord = words[2];
      thisWord = utils.configValue({config:config,value:thisWord});
      thisWord = utils.stackValue({dataStack:dataStack,value:thisWord});
      token  = "$..*[?(@property==='"+token.toLowerCase()+"'&&@.match(/"+thisWord+"/i))]^";
      if("rel id name".toLowerCase().indexOf(token.toLowerCase)===-1) {
        try {
          rt = JSON.parse(response.getBody('UTF8'));
          rt = JSONPath({path:token, json:rt})[0];
        } catch {
          // no-op
        }
      }  
      else {
        rt = "no response";
      }  
      break;
    case "FORMS":
      rt = JSON.parse(response.getBody('UTF8'));
      token = "$..*[?(@property==='rel')]"
      try {
        rt = JSONPath({path:token,json:rt});
        var fin = [];
        for(var i in rt) {
          var p = rt[i].split(" ");
          for (var j in p) {
            if(fin.indexOf(p[j])===-1) {
              fin.push(p[j]);
            }
          }
        }
        rt = fin;
      } catch {
        // no-op
      }
      break;  
    case "IDS":
      rt = JSON.parse(response.getBody('UTF8'));
      token = "$..*[?(@property==='id')]";
      try {
        rt = JSONPath({path:token,json:rt});
      } catch {
        // no-op
      }
      break;
    case "TAGS":
      token = "$..*[?(@property==='tags')]";
      try {
        rt = JSON.parse(response.getBody('UTF8'));
        rt = JSONPath({path:token, json:rt});
        var final = [];
        for(var i in rt) {
          var p = rt[i].split(" ");
          for (var j in p) {
            if(final.indexOf(p[j])===-1) {
              final.push(p[j]);
            }
          }
        }
        rt = final;
      } catch (err) {
        // no-op
        console.log(err);
      }
      break;  
    case "RELS":
      rt = JSON.parse(response.getBody('UTF8'));
      token = "$..*[?(@property==='rel')]";
      var final = [];
      try {
        rt = JSONPath({path:token,json:rt});
        for(var i=0; i<rt.length; i++) {
          var rel = rt[i];
          rel = rel.split(" ");
          for(var j=0; j<rel.length; j++) {
            if(final.indexOf(rel[j])===-1) {
              final.push(rel[j]);
            }    
          }
        }  
        rt = final;  
      } catch (err) {
        // no-op
        // console.log(err)
      }
      break;
    case "NAMES":
      rt = JSON.parse(response.getBody('UTF8'));
      token = "$..*[?(@property==='name')]";
      var final = [];
      try {
        rt = JSONPath({path:token,json:rt});
        for(var i=0; i<rt.length; i++) {
          var rel = rt[i];
          rel = rel.split(" ");
          for(var j=0; j<rel.length; j++) {
            if(final.indexOf(rel[j])===-1) {
              final.push(rel[j]);
            }    
          }
        }  
        rt = final;  
      } catch (err) {
        // no-op
        // console.log(err)
      }
      break;
    case "FORM":
      thisWord = words[2];
      thisWord = utils.configValue({config:config,value:thisWord});
      thisWord = utils.stackValue({dataStack:dataStack,value:thisWord});
      if(thisWord.toUpperCase()==='TEMPLATE') {
        try {
          rt = JSON.parse(response.getBody('UTF8')).collection.template||{}
        } catch (err) {
          // no-op
        }
      }
      else {
        path  = "$..*[?(@property==='rel'&&@.match(/"+thisWord+"/i))]^";
        try {
          rt = JSON.parse(response.getBody('UTF8'));
          rt = JSONPath({path:path, json:rt});
        } catch {
          // no-op
        }
      }
      break;
    case "TAG":
      thisWord = words[2];
      thisWord = utils.configValue({config:config,value:thisWord});
      thisWord = utils.stackValue({dataStack:dataStack,value:thisWord});
      path  = "$..*[?(@property==='tags'&&@.match(/"+thisWord+"/i))]^";
      try {
        rt = JSON.parse(response.getBody('UTF8'));
        rt = JSONPath({path:path, json:rt});
      } catch {
        // no-op
      }
      break;
    case "PATH":  
      token = words[2]||"$";
      token = utils.configValue({config:config,value:token});
      token = utils.stackValue({dataStack:dataStack,value:token});
      try {
        rt = JSON.parse(response.getBody('UTF8'));
        rt = JSONPath({path:token, json:rt});
        if(rt.length===1) {
          rt = rt[0];
        }
      } catch(err) {
        console.log(err)
        // no-op
      }
      break;
    default:
      /*  
      try {
        response = responses.peek()
        rt = JSON.parse(response.getBody("UTF8"));
      } catch {
        rt = "no response";
      }
      */
      rt = "";
  }
  return {responses:responses, dataStack:dataStack, config:config, config:config, words:words, rt:JSON.stringify(rt, null, 2)};
}

// show help text
function showHelp(thisWord) {
  var rt = "";
  rt = 
 `CJ
    HREF (returns the top-level HREF for this response)
    METADATA (returns the metadata collection)
    LINKS (returns the links collection)
    ITEMS (returns the items collection)
    QUERIES (returns the queries collection)
    TEMPLATE (returns the cj template)
    RELATED (returns a related collection)
    ERRORS|ERROR (returns any error object/array in the response)
    ID|REL|NAME|TAG|FORM <string|$#> (returns matching nodes)
    IDS|RELS|NAMES|TAGS|FORMS (returns simple list)
    PATH <jsonpath-string|$#>

    When using WITH-FORM, the following reserved words are supported:
      - TEMPLATE, TEMPLATE-POST, TEMPLATE-CREATE, CREATE
      - TEMPLATE-PUT, TEMPLATE-UPDATE, UPDATE
      - TEMPLATE-DELETE, DELETE
      
    As in:
      GOTO WITH-FORM TEMPLATE-UPDATE WITH-STACK

    CJ Templates ALWAYS use the response's collection.href as the URL`;
    
      
    console.log(rt);    
  
  return "";
}


