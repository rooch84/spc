spc = window.spc || {};

spc = function () {

  var ICON_SIZE = 9;

  var parseTime = function(format) {
    return d3v45.timeParse(format);
  };

  var margin = {
    top: 20,
    right: 20,
    bottom: 30,
    left: 50
  };

  /**
  *  Draws an SPC chart
  *
  * @param {Array} data
  * @param {String} container
  * @param {Object} properties
  */
  displayChart = function(data, container, properties, callback = function(p){} ) {

    d3v45.select(container).html("");

    data.sort(function(a,b) {return a.Date-b.Date;});

    var line = d3v45.line()
    .x(function(d) {
      return properties.x(d.Date);
    })
    .y(function(d) {
      return properties.y(d.Count);
    });

    properties.x = d3v45.scaleUtc().rangeRound([0, 0]);
    properties.y = d3v45.scaleLinear().rangeRound([0, 0]),

    configureProperties(properties, data);

    var strippedData = [];
    data.forEach(function(d) {
      var add = true;
      for (let i in properties.datesToExclude) {
        if (d.Date == i) {
          add = false;
        }
      }
      if (add) {
        strippedData.push(d);
      }
    });

    var g = d3v45.select(container).append("svg")
    .attr("width", '100%')
    .attr("height", '100%')
    .append("g")
    .attr("transform", "translate(" + margin.left  + "," + margin.top + ")");

    properties.x.domain(d3v45.extent(data, function(d) {
      return d.Date;
    }));

    properties.xAxis = d3v45.axisBottom(properties.x);
    properties.xAxis.ticks(8);
    g.append("g")
    .attr("class", "axis spc__axis--x");

    properties.yAxis = d3v45.axisLeft(properties.y);
    var axisY = g.append("g");
    axisY.attr("class", "axis spc__axis--y")
    .append("text")
    .attr("fill", "#000")
    .attr("transform", "rotate(-90)")
    .attr("y", 6)
    .attr("dy", "0.71em")
    .style("text-anchor", "end")
    .text("Count");

    g.append("line").classed("spc__hoverLine", true);

    var processLines = g.append("g").classed("spc__processLines", true);

    var lines = g.append("g");

    var dataDots = g.selectAll("dot").data(data)
    .enter().append("g");
    dataDots.attr("class", "spc__point")
    .attr("v", function(d) {
      return d.Date;
    })
    .on("click", function() {
      var d1 = d3v45.select(this).attr("v");
      if (d1 in properties.datesToExclude) {
        delete properties.datesToExclude[d1];
        d3v45.select(container).html("");
        callback(properties);
        displayChart(data, container, properties, callback);
      } else {
        properties.datesToExclude[d1] = true;
        d3v45.select(container).html("");
        callback(properties);
        displayChart(data, container, properties, callback);
      }
      d3v45.event.stopPropagation();
    });


    d3v45.select(container).select("svg")
    .on("mousemove", function() {
      var x = d3v45.mouse(this)[0]-margin.left;
      if (x > 0) {
        d3v45.select(this).select(".spc__hoverLine").style("display", null);
        d3v45.select(this).select(".spc__hoverLine").attr("x1", x).attr("x2", x);
      } else {
        d3v45.select(this).select(".spc__hoverLine").style("display", "none");
      }
    })
    .on("mouseout", function() {
      d3v45.select(this).select(".spc__hoverLine").style("display", "none");
    })
    .on("click", function() {
      if (properties.autoDetectProcess) {
        window.alert("Proccess can only be set in manual process detection mode");
      } else {
        var xDate = properties.x.invert(d3v45.mouse(this)[0]-margin.left);
        xDate = d3v45.bisector(function(d) { return d.Date; }).right(data, xDate, 1);
        if (properties.manualProcesses.indexOf(xDate) === -1) {
          properties.manualProcesses.push(xDate);
          callback(properties);
          displayChart(data, container, properties, callback);
        }
      }
    });

    if (properties.manualProcesses.length == 0  || properties.autoDetectProcess) {
      createProcess(properties.processes, 0);
    } else {
      var prev = 0;
      for (let i = 0; i < properties.manualProcesses.length; ++i) {
        var p = properties.manualProcesses[i];
        createProcess(properties.processes, prev, p-1);
        if (i == properties.manualProcesses.length - 1 ) {
          createProcess(properties.processes, p, data.length-1);
        }
        prev = p;
      }
    }

    this.calculateSignals(data, properties.processes, 0, properties.autoDetectProcess, properties.autoDetectUntil, properties.datesToExclude);

    var maxY = 0,
    minY = Number.MAX_SAFE_INTEGER;

    for (let i = 0; i < properties.processes.length; ++i) {
      var process = properties.processes[i];
      process.startDate = data[process.startIndex].Date;
      process.endDate = data[process.endIndex].Date;


      if (!process.startIndex == 0) {
        processLines.append("line").classed("processLine_" + process.startIndex, true);
        processLines.append("circle").classed("processSelection_" + process.startIndex, true)
        .attr("v", process.startIndex)
        .on("click", function() {
          val = d3v45.select(this).attr("v");
          for (let v in properties.manualProcesses) {
            if (properties.manualProcesses[v] == val) {
              properties.manualProcesses.splice(v,1);
              callback(properties);
              displayChart(data, container, properties, callback);
            }
            d3v45.event.stopPropagation();
          }
        });

      }

      for (let i in ControlLinesEnum) {
        g.append("line")
        .attr("class", "spc__limit " + ControlLinesEnum[i].id + "_" + process.startIndex)
        .attr("stroke-dasharray", ControlLinesEnum[i].dash);
      }

      lines.append("path").datum(data.slice(process.startIndex, process.endIndex+1))
      .attr("class", "spc__line spc__line_" + process.startIndex);

      dataDots.filter(function (d) {
        for (let datum of data.slice(process.startIndex, process.endIndex+1)) {
          if (datum.Date == d.Date) {
            return true;
          }
        }
        return false;
      }).each(function(d) {
        d3v45.select(this).attr("transform", "translate(" + properties.x(d.Date) + "," + properties.y(d.Count) + ")");
        if (d.Date in properties.datesToExclude ) {
          d3v45.select(this).append("circle")
          .attr("cx", 0)
          .attr("cy", 0)
          .attr("r" , ICON_SIZE * 0.5)
          .attr("fill", "grey");
        } else if (d.Date in properties.processes[i].signals) {
          SignalEnum[properties.processes[i].signals[d.Date]].shape(d3v45.select(this), 0, 0, ICON_SIZE);
        } else {
          d3v45.select(this).append("rect")
          .attr("x", function(d) {
            return ICON_SIZE * -0.5;
          })
          .attr("y", function(d) {
            return ICON_SIZE * -0.5;
          }).attr("width" , ICON_SIZE).attr("height" , ICON_SIZE);
        }

      });

      if (process.mean + 3.5 * process.sd > maxY) {
        maxY = process.mean + 3.5 * process.sd;
      }
      if (process.mean - 3.5 * process.sd < minY) {
        minY = process.mean - 3.5 * process.sd;
      }
    }

    properties.y.domain([minY, maxY]);
    resizeChart(container, properties);
  };

  resizeChart = function(container, properties) {
    var main = d3v45.select(container);
    var box = d3v45.select(container).node().getBoundingClientRect();

    var width = box.width - margin.right - margin.left;
    var height = box.height - margin.top - margin.bottom;

    main.select(".spc__axis--x")
    .attr("transform", "translate(0," + height + ")")

    properties.x.rangeRound([0, width]);
    properties.y.rangeRound([height, 0]);

    properties.xAxis.ticks(width / 100);
    main.select(".spc__axis--x").call(properties.xAxis);

    properties.yAxis.ticks(height / 50  );
    main.select(".spc__axis--y").call(properties.yAxis);

    var line = d3v45.line()
    .x(function(d) {
      return properties.x(d.Date);
    })
    .y(function(d) {
      return properties.y(d.Count);
    });

    main.selectAll(".spc__point").each(function(d) {
      d3v45.select(this).attr("transform", "translate(" + properties.x(d.Date) + "," + properties.y(d.Count) + ")");
    });

    for (let j of properties.processes ) {
      setLinePos(main.select(".processLine_" + j.startIndex), properties.x(j.startDate), 0, properties.x(j.startDate), height);
      main.select(".processSelection_" + j.startIndex).attr("cx", properties.x(j.startDate)).attr("cy", 0.5 * ICON_SIZE).attr("r", 0.5*ICON_SIZE);
      for (let i in ControlLinesEnum) {
        if (j.startDate != j.endDate) {
          setLinePos(main.select("." + ControlLinesEnum[i].id + "_" + j.startIndex), properties.x(j.startDate),
          properties.y(j.mean + ControlLinesEnum[i].index * j.sd), properties.x(j.endDate), properties.y(j.mean + ControlLinesEnum[i].index * j.sd));
       }
      }

      main.select(".spc__line_" + j.startIndex).attr("d", line);
    }

    main.select(".spc__hoverLine").attr("y1", 0).attr("y2", height);

  };

  getSignals = function(data, properties) {
    configureProperties(properties, data);
    createProcess(properties.processes, 0);
    this.calculateSignals(data, properties.processes, 0, properties.autoDetectProcess, properties.autoDetectUntil, properties.datesToExclude);
  }

  calculateSignals = function(data, processes, pIndex, autoDetectProcess, autoDetectUntil, datesToExclude) {

    var process = processes[pIndex];
    if (process.endIndex >= data.length) {
      process.endIndex = data.length - 1;
    } else {
      process.endIndex--;
    }

    var processFound = false;
    while (!processFound && process.endIndex < data.length -1 && (process.cap == -1 || process.endIndex < process.cap) ) {

      process.endIndex++;
      process.signals = {};
      var signalTracker = {};
      for (let i in SignalEnum) {
        signalTracker[SignalEnum[i].id] = [];
      };

      if (isEmpty(datesToExclude)) {
        process.mean = mean(data.slice(process.startIndex,  process.endIndex+1));
        process.sd = sd(data.slice(process.startIndex,  process.endIndex+1));
      } else {
        var tmpData = [];
        for (let i = process.startIndex; i < process.endIndex; i++) {
          if (!(data[i].Date in datesToExclude)) {
            tmpData.push(data[i]);
          }
          process.mean = mean(tmpData);
          process.sd = sd(tmpData);
        }
      }

      var j = 0;
      for (j = process.endIndex; j >= process.startIndex; --j) {
        var d = data[j];

        if (!(d.Date in datesToExclude)) {
          for (let i in SignalEnum) {
            var sig = SignalEnum[i];
            if (sig.rule(d.Count, process.mean, process.sd)) {
              processFound =  incrementSignal(signalTracker, sig, d.Date, processes, j, j == process.startIndex ? false : autoDetectProcess, autoDetectUntil);
            } else {
              clearSignal(process.signals, signalTracker, sig);
            }
            if (processFound) {
              break;
            }
          }
          if (processFound) {
            break;
          }
        }
      }
      if (processFound) {
        if (isEmpty(datesToExclude)) {
          process.mean = mean(data.slice(process.startIndex,  process.endIndex+1));
          process.sd = sd(data.slice(process.startIndex,  process.endIndex+1));
        } else {
          var tmpData = [];
          for (let i = process.startIndex; i < process.endIndex; i++) {
            if (!(data[i].Date in datesToExclude)) {
              tmpData.push(data[i]);
            }
            process.mean = mean(tmpData);
            process.sd = sd(tmpData);
          }
        }
      }
    }

    for (let i in SignalEnum) {
      var val = SignalEnum[i];
      addSignalToTracker(process.signals, signalTracker, val);
    };

    if (processFound || pIndex < processes.length - 1) {
      calculateSignals(data, processes, pIndex + 1, autoDetectProcess, autoDetectUntil, datesToExclude);
    }
  };

  mean = function(data) {
    return d3v45.mean(data, function(d) {
      return d.Count;
    });
  }

  sd = function(data) {
    return d3v45.deviation(data, function(d) {
      return d.Count;
    });
  }

  incrementSignal = function(signalTracker, signalType, id, processes, index, autoDetectProcess, autoDetectUntil) {
    signalTracker[signalType.id].push(id);

    if ((signalType.id == SignalEnum.EIGHT_OVER_MEAN.id || signalType.id == SignalEnum.EIGHT_UNDER_MEAN.id) &&
    signalTracker[signalType.id].length == SignalEnum.EIGHT_OVER_MEAN.length  && autoDetectProcess && new Date(id) < new Date(autoDetectUntil)) {
      createProcess(processes, index);
      return true;
    }
    return false;
  }

  createProcess = function(processes, index, cap = -1) {
    var endIndex = index + SignalEnum.EIGHT_OVER_MEAN.length;
    if (endIndex > cap) {
      endIndex = cap;
    }
    processes.push({
      "startIndex" : index,
      "endIndex" : endIndex,
      "cap" : cap
    });
    if (processes.length > 1 && cap == -1) {
      processes[processes.length - 2].endIndex = index - 1;
    }
  }

  clearSignal  = function(signals, signalTracker, signalType) {
    addSignalToTracker(signals, signalTracker, signalType);
    signalTracker[signalType.id] = [];
  }

  addSignalToTracker = function(signals, signalTracker, signalType) {
    if (signalTracker[signalType.id].length >= signalType.length) {
      signalTracker[signalType.id].forEach(function (d) {
        if ((d in signals && signalType.length < SignalEnum[signals[d]].length) || !(d in signals)) {
          signals[d] = signalType.id;
        }
      });
    }
  }

  setLinePos = function(e, x1, y1, x2, y2) {
    e.attr("x1", x1)
    .attr("y1", y1)
    .attr("x2", x2)
    .attr("y2", y2);
  }

  isEmpty = function(obj) {
    for(let prop in obj) {
      if(obj.hasOwnProperty(prop))
      return false;
    }

    return true;
  }

  configureProperties = function(properties, data) {
    properties.processes = [];
    if (!("autoDetectProcess" in properties)) {
      properties.autoDetectProcess = false;
    }

    if ("manualProcesses" in properties) {
      properties.manualProcesses.sort(function(a, b) {
        return a - b;
      });
    } else {
      properties.manualProcesses = [];
    }

    if (!("datesToExclude" in properties)) {
      properties.datesToExclude = {};
    }

    if (!("autoDetectUntil" in properties)) {
      properties.autoDetectUntil = d3v45.max(data, function(d) { return d.Date});
    }

    properties.dates = [];
    data.forEach(function(d) {
      properties.dates.push(d.Date);
    })

  }

  /**
  * Satatic behaviours
  **/

  ControlLinesEnum = {
    UCL3_LINE : {id: "UCL3_LINE", index : 3, "dash": "0"},
    UCL2_LINE : {id: "UCL2_LINE", index : 2, "dash": "5, 5"},
    UCL1_LINE : {id: "UCL1_LINE", index : 1.5, "dash": "10, 10"},
    MEAN_LINE : {id: "spc__MEAN_LINE", index : 0, "dash": "0"},
    LCL1_LINE : {id: "LCL1_LINE", index : -1.5, "dash": "10, 10"},
    LCL2_LINE : {id: "LCL2_LINE", index : -2, "dash": "5, 5"},
    LCL3_LINE : {id: "LCL3_LINE", index : -3, "dash": "0"}
  }

  signalIsBelow = function(d) {
    if (SignalEnum[d].rule(0,1,0)) {
      return true;
    }
    return false;
  }

  SignalEnum = {
    EIGHT_OVER_MEAN : { "id" : "EIGHT_OVER_MEAN", "length" : 8, "index" : 4, "rule" : function(v,mean, sd = 0) {
      if (v > mean) {
        return true;
      }
      return false;
    }, "shape" : function (container, x, y, size) {
      createCircle(size, x, y, container, "spc__overSignal_fill");
    }},
    EIGHT_UNDER_MEAN : { "id" : "EIGHT_UNDER_MEAN", "length" : 8, "index" : 3, "rule" : function(v,mean, sd = 0) {
      if (v < mean) {
        return true;
      }
      return false;
    }, "shape" : function (container, x, y, size) {
      createCircle(size, x, y, container, "spc__underSignal_fill");
    }},
    TWO_OVER_TWO : { "id" : "TWO_OVER_TWO", "length" : 2, "index" : 6, "rule" : function(v,mean,sd) {
      if (v > mean + sd * 2) {
        return true;
      }
      return false;
    }, "shape" : function (container, x, y, size) {
      createDiamond(size, x, y, container, "spc__overSignal_fill");
    }},
    TWO_UNDER_TWO : { "id" : "TWO_UNDER_TWO", "length" : 2, "index" : 1, "rule": function(v,mean, sd) {
      if (v < mean - sd * 2) {
        return true;
      }
      return false;
    }, "shape" : function (container, x, y, size) {
      createDiamond(size, x, y, container, "spc__underSignal_fill");
    }},
    THREE_OVER_ONE_FIVE : { "id" : "THREE_OVER_ONE_FIVE", "length" : 3, "index" : 5, "rule": function(v,mean, sd) {
      if (v > mean + sd * 1.5) {
        return true;
      }
      return false;
    }, "shape" : function (container, x, y, size) {
      createTriangle(size, x, y, container, "spc__overSignal_fill");
    }},
    THREE_UNDER_ONE_FIVE : { "id" : "THREE_UNDER_ONE_FIVE", "length" : 3, "index" : 2, "rule": function(v,mean, sd) {
      if (v < mean - sd * 1.5) {
        return true;
      }
      return false;
    }, "shape" : function (container, x, y, size) {
      createTriangle(size, x, y, container, "spc__underSignal_fill");
    }},
    ONE_OVER_THREE : { "id" : "ONE_OVER_THREE", "length" : 1,  "index" : 7, "rule": function(v,mean, sd) {
      if (v > mean + sd*3) {
        return true;
      }
      return false;
    }, "shape" : function(container, x, y, size) {
      createCross(size, x, y, container, "spc__overSignal_fill");
    }},
    ONE_UNDER_THREE: { "id" : "ONE_UNDER_THREE", "length" : 1,  "index" : 0, "rule": function(v,mean, sd) {
      if (v < mean - sd * 3) {
        return true;
      }
      return false;
    }, "shape" : function(container, x, y, size) {
      createCross(size, x, y, container, "spc__underSignal_fill");
    }}
  }


  /**
  * Drawing functions
  **/

  createCircle = function(size, x, y, container, colour) {
    container.append("circle")
    .attr("cx", function(d) {
      return x;
    })
    .attr("cy", function(d) {
      return y;
    })
    .attr("r", size / 2)
    .classed(colour, true);
  }

  createDiamond = function(size, x, y, container, colour) {
    var r = size / 2;
    container.append('polyline')
    .attr('points', function(d) {
      return (-r+x) +  " " + y
      + " " + x + " " + (-r + y)
      + " " + (r+x) + " " + y
      + " " + x +  " " + (r+y)
      + " " + (-r+x) + " " + y;
    } )
    .classed(colour, true);
  }

  createTriangle = function(size, x, y, container, colour) {
    var r = size / 2;
    container.append('polyline')
    .attr('points', function(d) {
      return (-r+x) +  " " + (r+y)
      + " " + (r+x) + " " + (r+y)
      + " " + x + " " + (-r+y)
      + " " + (-r+x) + " " + (r+y);
    })
    .classed(colour, true);
  }

  createCross = function(size, x, y, container, colour) {
    var s = 1.0 / size * (size / 2.5);
    var r = size / 2;

    container.append("polyline")
    .attr('points', function(d) {
      return  (x - r)            + " " + (y - (1-s) * r)      // left      , above middle
      + " " + (x - (1-s)*r)    + " " + (y - r)                // near left , top
      + " " + x                + " " + (y - s * r)          // middle , above middle
      + " " + (x + ((1-s)* r)) + " " + (y - r)              // near right, top
      + " " + (x + r)          + " " + (y - r + (s * r))    // right, near top
      + " " + (x + s * r)      + " " + y                    // right of middle, middle
      + " " + (x + r)          + " " + (y + r - (s * r))    // right, near bottom
      + " " + (x + ((1-s)* r)) + " " + (y + r)              // near right, bottom
      + " " + x                + " " + (y + s * r)          // middle, below middle
      + " " + (x - (1-s)*r)    + " " + (y + r)                // near left, bottom
      + " " + (x - r)           + " " + (y + (1-s) * r)       // left, near bottom
      + " " + (x - s * r)      + " " + y                    // left of middle, middle
      + " " + (x - r)           + " " + (y - (1-s) * r);      // left      , near top
      } )
      .classed(colour, true);
  }

  /**
  * Declare public functions
  */

  return {
    "parseTime" :  parseTime,
    "displayChart" : displayChart,
    "calculateSignals" : calculateSignals,
    "resizeChart" : resizeChart,
    "getSignals" : getSignals,
    "isEmpty" : isEmpty,
    "signalIsBelow" : signalIsBelow,
    "SignalEnum" : SignalEnum
  }

}();
