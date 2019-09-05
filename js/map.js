spcmap = window.spcmap || {};

spcmap = function () {

  var vers = "1.0";

  version = function () {return vers;};

  initalizeToolip = function(container) {
    return d3v45.select(container).append('div').attr('class', 'hidden tooltip');
  }

  drawGeo = function(geo, container, tooltip, linkedViews = [], colourScale, colourAttribute) {
    d3v45.selectAll("." + container).each( function (d,i) {

      var svgGeo = d3v45.select(this).append("svg").attr("width", '100%')
      .attr("height", '100%');

      var width = d3v45.select(this).node().getBoundingClientRect().width;
      var height = d3v45.select(this).node().getBoundingClientRect().height;

      var x = d3v45.scaleLinear().range([0, width]);
      var y = d3v45.scaleLinear().range([0, height]);

      // Create a unit projection.
      var projection = d3v45.geoMercator().scale(1).translate([0, 0]);
      // Create a path generator.
      var path = d3v45.geoPath().projection(projection);

      // Compute the bounds of a feature of interest, then derive scale & translate.
      var b = path.bounds(geo), s = .95 / Math.max((b[1][0] - b[0][0]) / width, (b[1][1] - b[0][1]) / height), t = [(width - s * (b[1][0] + b[0][0])) / 2, (height - s * (b[1][1] + b[0][1])) / 2];
      // Update the projection to use computed scale & translate.
      projection.scale(s).translate(t);

      var las = svgGeo.selectAll('.las').data(geo.features).enter();
      las.append('path').attr('class', function(d) {
        return d.properties.Name;
      }).attr('d', path).attr("class", function(d) {
        return container + "_" + d.properties.Name.split(" ").join("_");
      }, true).classed("las", true).classed("hoverMe", true).attr("label", function(d) {
        return d.properties.Name.split(" ").join("_");
      }).on('mousemove', function(d) {

        var me = d3v45.select(this);
        var mouse = d3v45.mouse(svgGeo.node()).map(function(d) {
          return parseInt(d);
        });
        var bbox = d3v45.select("." + container).node().getBoundingClientRect();
        tooltip.classed('hidden', false)
        .attr('style', 'left:' + (mouse[0] + 15 + bbox.left) + 'px; top:' + (mouse[1] + bbox.top - 35) + 'px')
        .html("" + d.properties.Neighbourh + ", " + d.properties.NPU + "<br />"
        + "Population: " + d.properties.pop2011 + "");
        for (let n of linkedViews) {
          d3v45.selectAll("." + n + "_" + me.attr("label")).classed("las--link", true);
        }

      }).on('mouseout', function() {
        tooltip.classed('hidden', true);
        var me = d3v45.select(this);

        for (let n of linkedViews) {
          d3v45.selectAll("." + n + "_" + me.attr("label")).classed("las--link", false);
        }
      }).attr("fill", function(d, i) { return colourScale(d.properties[colourAttribute])});
    });
  }

  drawNMap = function(geo, container, tooltip, linkedViews = [], colourScale, colourAttribute, sizedBy = "") {
    var mode = "normal";
    var svgGeo = d3v45.select("." + container).append("svg").attr("width", '100%')
    .attr("height", '100%');

    var width = d3v45.select("." + container).node().getBoundingClientRect().width;
    var height = d3v45.select("." + container).node().getBoundingClientRect().height;

    var max_weight = d3v45.max(geo, function(d) {
      return d.properties.population;
    });

    var elements = [];
    for (var i = 0; i < geo.features.length; i++) {

      elements.push(new nmap_element({
        id : geo.features[i].properties.Name,
        x : geo.features[i].properties.lon,
        y : geo.features[i].properties.lat,
        colour : geo.features[i].properties[colourAttribute],
        weight : sizedBy == "" ? 1000 + Math.random() : geo.features[i].properties[sizedBy],  // 1000 + Math.random()
        label : geo.features[i].properties.Neighbourh + ", " + geo.features[i].properties.NPU + "<br />"
        + "Population: " + geo.features[i].properties.pop2011,
        klass : 10
      }));
    }
    var map = new nmap({
      x : 0,
      y : 0,
      width : width,
      height : height
    });

    if (mode == "alternate") {
      //NMap Alternate Cut Approach
      var ac = map.alternateCut({
        elements : elements
      });
    } else {
      //Equal Weight Approach
      var ac = map.equalWeight({
        elements : elements
      });
    }

    svgGeo.append("g").attr("class", "nmap").selectAll("rect").data(ac).enter().append("rect").attr("x", function(d) {
      return d.attr().x;
    }).attr("y", function(d) {
      return height - d.attr().y - d.attr().height;
    }).attr("width", function(d) {
      return d.attr().width;
    })
    .attr("height", function(d) {
      return d.attr().height;
    })
    .attr("class", function(d) {
      return container + "_" + d.attr().element.attr().id.split(" ").join("_");
    })
    .classed("las", true)
    .classed("hoverMe", true)
    .attr("label", function(d) {
      return d.attr().element.attr().label;
    })
    .attr("key", function(d) {
      return d.attr().element.attr().id.split(" ").join("_");
    })
    .on('mousemove', function(d) {

      var me = d3v45.select(this);
      var mouse = d3v45.mouse(this);
      var bbox = d3v45.select("." + container).node().getBoundingClientRect();
      tooltip.classed('hidden', false)
      .attr('style', 'left:' + (mouse[0] + 15 + bbox.left) + 'px; top:' + (bbox.top + mouse[1] - 35 ) + 'px')
      .html(me.attr("label").split("_").join(" "));

      for (let n of linkedViews) {
        d3v45.selectAll("." + n + "_" + me.attr("key")).classed("las--link", true);
      }

    }).on('mouseout', function() {
      tooltip.classed('hidden', true);
      var me = d3v45.select(this);
      for (let n of linkedViews) {
        d3v45.selectAll("." + n + "_" + me.attr("key")).classed("las--link", false);
      }
    })
    .attr("fill", function(d, i) { return colourScale(d.attr().element.attr().colour)});

  }

  drawSMWG = function(data, container, properties) {

    defaultProperties = {
      "tooltip" : "",
      "linkedViews" : [],
      "callback" : function(d) {},
      "colourScale" : function (d) { return "#FFFFF8";},
      "colourAttribute" : "",
      "offsetX" : 0,
      "offsetY" : 0,
      "gridX" : -1,
      "gridY" : -1,
      "strokeColour" : function(d) {return "#FFFFF8"},
      "movable" : false,
      "snapX" : 1,
      "snapY" : 1,
      "superlabel" : "",
    }

    for (let key of Object.keys(defaultProperties)) {
      if (!(key in properties)) {
        properties[key] = defaultProperties[key];
      }
    }

    data.forEach(function(d) {
      d.gridX = +d.gridX;
      d.gridY = +d.gridY;
    });

    var totalGridX = d3v45.max(data, function(d) {
      return d.gridX + 1 - properties.offsetX;
    });

    var totalGridY = d3v45.max(data, function(d) {
      return d.gridY + 1 - properties.offsetY;
    });

    var containers = d3v45.selectAll("." + container).each( function (d,i) {

      var svgGeo = d3v45.select(this).append("svg").attr("width", '100%')
      .attr("height", '100%');

      var width = d3v45.select(this).node().getBoundingClientRect().width;
      var height = d3v45.select(this).node().getBoundingClientRect().height;

      var gridW = width / totalGridX;
      var gridH = height / totalGridY;

      var startX = 0;
      var startY = 0;
      if (totalGridX < properties.gridX) {
        gridW = width / properties.gridX;
        startX = (properties.gridX - totalGridX -1 ) * gridW;
        totalGridX = properties.gridX;
      }

      if (totalGridY < properties.gridY) {
        gridH = height / properties.gridY;
        startY = (properties.gridY - totalGridY - 1) * gridH;
        totalGridY = properties.gridY;
      }

      svgGeo
      .selectAll("rect").data(data).enter().append("g")
      .attr("transform", function(d) {
        return "translate(" + (startX + (d.gridX - properties.offsetX) * gridW)  + "," + (startY + (d.gridY - properties.offsetY) * gridH) + ")";
      } )
      .attr("class", function(d) {
        return container + "_" + d.region;
      })
      .on('mousedown', function(d) {
        if (properties.movable) {
          var parent = d3v45.select(this.parentNode);
          var div = d3v45.select(this)
          .classed("active", true);

          var snapX = width  / (totalGridX * properties.snapX);
          var snapY= height  / (totalGridY * properties.snapY);
          var offset = d3v45.mouse(div.node());
          var w = d3v45.select(window)
          .on("mousemove", mousemove)
          .on("mouseup", mouseup);

          d3v45.event.preventDefault();

          function mousemove() {
            var mouse = d3v45.mouse(parent.node());
            div.attr("transform", "translate(" +
            (parseInt( (mouse[0] - offset[0]) / snapX) * snapX)
            + "," +
            (parseInt( (mouse[1] - offset[1]) / snapY) * snapY)
            + ")");
          }

          function mouseup() {
            div.classed("active", false);
            w.on("mousemove", null).on("mouseup", null);
          }
        }
      })
      .on('mousemove', function(d) {

        var me = d3v45.select(this);
        var mouse = d3v45.mouse(this);
        var bbox = d3v45.select(this).node().getBoundingClientRect();
        tooltip.classed('hidden', false)
        .attr('style', 'left:' + (bbox.left + mouse[0] + 15) + 'px; top:' + (bbox.top + mouse[1] - 35 ) + 'px')
        .html("" + d.Neighbourh + ", " + d.NPU + "<br />"
        + "Population: " + d.pop2011 + "");

        for (let n of properties.linkedViews) {
          d3v45.selectAll("." + n + "_" + me.attr("label")).classed("las--link", true);
        }
      })
      .on('mouseenter', function(d) {
        var opacity = d3v45.select(this).select("rect").attr("opacity");
        d3v45.select(this).select("rect").attr("opacity", 0.3);

        d3v45.select(this).on('mouseleave', function() {
          d3v45.select(this).select("rect").attr("opacity", opacity);
          tooltip.classed('hidden', true);
          var me = d3v45.select(this);
          for (let n of properties.linkedViews) {
            d3v45.selectAll("." + n + "_" + me.attr("label")).classed("las--link", false);
          }
        });

      })
      .on('click', function(d) {
        properties.callback(d3v45.select(this).attr("label"), d3v45.select(this).attr("superlabel"));
      })
      .attr("label", function(d) {
        return d.region;
      })
      .attr("superlabel", function(d) {
        return properties.superlabel;
      })
      .append("rect")
      .attr("width", gridW)
      .attr("height", gridH)
      .classed("las", true)
      .attr("fill", function(d, i) { return properties.colourScale(d[properties.colourAttribute])})
      .attr("stroke", function(d, i) { return properties.strokeColour(d[properties.colourAttribute])});

      svgGeo.selectAll("g").append("g").classed("iconContainer", true);
    });
  }

  addSignalsAsColourOnly = function(container, cell, properties, today) {
    var signals = properties.processes[properties.processes.length-1].signals;
    if (today in signals)   {
      if (spc.signalIsBelow(signals[today])) {
        var containers = d3v45.selectAll("." + container).each( function (d,i) {
          var bbox = d3v45.select(this).select("." + container + "_" + cell).node().getBoundingClientRect();
          d3v45.select(this).select("." + container + "_" + cell).select(".iconContainer")
          .append("rect")
          .attr("x",0)
          .attr("y", 0)
          .attr("width", bbox.width)
          .attr("height", bbox.height)
          .classed("spc__underSignal_fill", true);
        });
      } else {
        var containers = d3v45.selectAll("." + container).each( function (d,i) {
          var bbox = d3v45.select(this).select("." + container + "_" + cell).node().getBoundingClientRect();
          d3v45.select(this).select("." + container + "_" + cell).select(".iconContainer")
          .append("rect")
          .attr("x",0)
          .attr("y", 0)
          .attr("width", bbox.width)
          .attr("height", bbox.height)
          .classed("spc__overSignal_fill", true);
        });
      }
    }
  }

  addSignalsAsIcons = function(container, cell, properties, today, opacity, margin = 0, colourOveride = "") {
    var signals = properties.processes[properties.processes.length-1].signals;
    if (today in signals)   {
      var containers = d3v45.selectAll("." + container).each( function (d,i) {
        var bbox = d3v45.select(this).select("." + container + "_" + cell).node().getBoundingClientRect();
        var size = bbox.width - 2*margin*bbox.width;
        if (bbox.height < bbox.width) {
          size = bbox.height - 2*margin*bbox.height;
        }
        spc.SignalEnum[signals[today]].shape(d3v45.select(this).select("." + container + "_" + cell).select(".iconContainer"), 0.5*bbox.width, 0.5*bbox.height, 0.9*size)
        d3v45.select(this).select("." + container + "_" + cell).select(".iconContainer").attr("stroke-width", 0);
        d3v45.select(this).select("." + container + "_" + cell).select(".iconContainer").selectAll("*").attr("opacity", opacity);

        if (colourOveride != "") {
          d3v45.select(this).select("." + container + "_" + cell).select(".iconContainer").selectAll("*")
          .attr("fill", colourOveride)
          .classed("spc__overSignal_fill", false)
          .classed("spc__underSignal_fill", false)
          .attr("stroke-width", 0.05)
          .attr("stroke", "#FFF");
          // .attr("stroke", colourOveride);
        }

      });
    }
  }

  addSignalsAsGlyphs = function(container, cell, properties, today, strokeColour) {
    var signals = properties.processes[properties.processes.length-1].signals;

    if (today in signals)   {
      var containers = d3v45.selectAll("." + container).each( function (d,i) {
        var bbox = d3v45.select(this).select("." + container + "_" + cell).node().getBoundingClientRect();
        //spc.SignalEnum[signals[today]].shape(d3v45.select(this).select("." + container + "_" + cell).select(".iconContainer"), 0.5*bbox.width, 0.5*bbox.height, bbox.width);
        //d3v45.select(this).select("." + container + "_" + cell).select(".iconContainer").append()

        if (spc.signalIsBelow(signals[today])) {
          d3v45.select(this).select("." + container + "_" + cell).select(".iconContainer")
          .attr("transform", "rotate(" + ((9 - spc.SignalEnum[signals[today]].length) * 9  ) + " " + (0.5*bbox.width) + " " + (0.5*bbox.height) + ")")
          .append("line").attr("y1", 0.5*bbox.height).attr("x1", 0.1*bbox.width).attr("y2", 0.5*bbox.height).attr("x2", 0.9*bbox.width)
          .classed("spc__underSignal_stroke", true);
        } else {
          d3v45.select(this).select("." + container + "_" + cell).select(".iconContainer").attr("transform", "rotate(" + ((9 - spc.SignalEnum[signals[today]].length) * -9) + " " + (0.5*bbox.width) + " " + (0.5*bbox.height) + ")")
          .append("line").attr("y1", 0.5*bbox.height).attr("x1", 0.1*bbox.width).attr("y2", 0.5*bbox.height).attr("x2", 0.9*bbox.width)
          .classed("spc__overSignal_stroke", true);
        }
      });
    } else {
      var containers = d3v45.selectAll("." + container).each( function (d,i) {
        var bbox = d3v45.select(this).select("." + container + "_" + cell).node().getBoundingClientRect();
        d3v45.select(this).select("." + container + "_" + cell).select(".iconContainer")
        .append("line").attr("y1", 0.5*bbox.height).attr("x1", 0.1*bbox.width).attr("y2", 0.5*bbox.height).attr("x2", 0.9*bbox.width)
        .classed("glyphNoSignal", true).attr("stroke", strokeColour);
      });
    }
  }

  addSignalsAsGlyphsAngleAsMean = function(container, cell, properties, today, data, setWidth, strokeColour) {
    var signals = properties.processes[properties.processes.length-1].signals;

    data.sort(function(a, b) {
      return b.Date - a.Date;
    });

    var sd4 = properties.processes[properties.processes.length-1].sd*4;

    if (today in signals)   {
      var containers = d3v45.selectAll("." + container).each( function (d,i) {
        var bbox = d3v45.select(this).select("." + container + "_" + cell).node().getBoundingClientRect();

        var total = 0;
        var count = 0;
        var z;
        var prevDate = data[count].Date;
        var strokeClass = "";

        if (spc.signalIsBelow(signals[today])) {
          while (prevDate in signals && spc.signalIsBelow(signals[prevDate])) {
            total += data[count].Count;
            count++;
            prevDate = data[count].Date;
          }
          z = total / count - properties.processes[properties.processes.length-1].mean;
          strokeClass = "spc__underSignal_stroke";
        } else {
          while (prevDate in signals && !(spc.signalIsBelow(signals[prevDate]))) {
            total += data[count].Count;
            count++;
            prevDate = data[count].Date;
          }
          z = total / count - properties.processes[properties.processes.length-1].mean;
          strokeClass = "spc__overSignal_stroke";
        }
        var line = d3v45.select(this).select("." + container + "_" + cell).select(".iconContainer").append("line").classed(strokeClass, true);

        line.attr("transform", "rotate(" + map(z, 0, sd4, 0, -80) + " " + (0.5*bbox.width) + " " + (0.5*bbox.height) + ")")
        .attr("y1", 0.5*bbox.height).attr("x1", 0.1*bbox.width).attr("y2", 0.5*bbox.height).attr("x2", 0.9*bbox.width)
        .style("stroke-width", setWidth ? 1 + (count - spc.SignalEnum[signals[today]].length) : 1).attr("opacity", 1);

      });
    } else {
      var z = 0;
      for (let x of data) {
        if (x.Date.getTime() == today.getTime()) {
          z = x.Count - properties.processes[properties.processes.length-1].mean;
        }
      }

      var containers = d3v45.selectAll("." + container).each( function (d,i) {
        var bbox = d3v45.select(this).select("." + container + "_" + cell).node().getBoundingClientRect();
        var line = d3v45.select(this).select("." + container + "_" + cell).select(".iconContainer").append("line").classed("glyphNoSignal", true)
        .attr("stroke", strokeColour);
        line.attr("transform", "rotate(" + map(z, 0, sd4, 0, -80) + " " + (0.5*bbox.width) + " " + (0.5*bbox.height) + ")")
        .attr("y1", 0.5*bbox.height).attr("x1", 0.1*bbox.width).attr("y2", 0.5*bbox.height).attr("x2", 0.9*bbox.width).attr("opacity", 1);
      });
    }
  }

  addSignalsAsTemporalGrid = function(container, cell, properties, data) {
    var NUM_BINS = 5;
    var NUM_SIGNALS = 8;

    var signals = properties.processes[properties.processes.length-1].signals;

    data.sort(function(a, b) {
      return a.Date - b.Date;
    });

    var containers = d3v45.selectAll("." + container).each( function (d,p) {
      d3v45.select(this).select("." + container + "_" + cell).select("rect").attr("fill", "#EEE");
      d3v45.select(this).select("." + container + "_" + cell).select(".iconContainer").html("");
    });

    for (var i = 0; i < NUM_BINS; ++i) {
      var s = Math.ceil(i * ((data.length-1) / 5));
      var e = Math.floor((i+1)  * ((data.length-1) / 5));
      for (let j = s; j <= e; j++) {
        if (data[j].Date in signals) {
          var containers = d3v45.selectAll("." + container).each( function (d,p) {
            var bbox = d3v45.select(this).select("." + container + "_" + cell).node().getBoundingClientRect();
            var width = bbox.width - 2;
            var height = bbox.height - 2;

            var ic = d3v45.select(this).select("." + container + "_" + cell).select(".iconContainer").attr("transform", "translate(1,1)");

            ic.append("rect")
            .attr("x", i * (width / NUM_BINS) )
            .attr("y",  height - (height / NUM_SIGNALS) - spc.SignalEnum[signals[data[j].Date]].index * (height / NUM_SIGNALS) )
            .attr("width", width / NUM_BINS)
            .attr("height", (height / NUM_SIGNALS) )
            .attr("stroke-width", 0.3)
            .classed(spc.SignalEnum[signals[data[j].Date]].index > 3 ? "spc__overSignal_fill" : "spc__underSignal_fill", true);
          });
        }

      }
    }

  }

  addSignalsAsTrendChannel = function(container, cell, properties, data, size) {
    var NUM_BINS = 5;
    var NUM_SIGNALS = 8;

    var signals = properties.processes[properties.processes.length-1].signals;

    data.sort(function(a, b) {
      return a.Date - b.Date;
    });

    var containers = d3v45.selectAll("." + container).each( function (d,p) {
      //d3v45.select(this).select("." + container + "_" + cell).select("rect").attr("fill", "#EEE");
      //d3v45.select(this).select("." + container + "_" + cell).select(".iconContainer").html("");
    });

    var containers = d3v45.selectAll("." + container).each( function (d,p) {
      var bbox = d3v45.select(this).select("." + container + "_" + cell).node().getBoundingClientRect();
      var width = bbox.width - 2;
      var height = bbox.height - 2;
      d3v45.select(this).select("." + container + "_" + cell).select(".iconContainer")
      .append("rect")
      .classed("positiveChannel", true)
      .attr("x", 1 )
      .attr("y", (1 - size ) * height - 1)
      .attr("width", width)
      .attr("height", size * height)
      .attr("fill", "none")
      .attr("stroke", "none");

      d3v45.select(this).select("." + container + "_" + cell).select(".iconContainer")
      .append("rect")
      .classed("negativeChannel", true)
      .attr("x", 1 )
      .attr("y", 1)
      .attr("width", width)
      .attr("height", size * height)
      .attr("fill", "none")
      .attr("stroke", "none");
    });

    for (var i = 0; i < NUM_BINS; ++i) {
      var s = Math.ceil(i * ((data.length-1) / 5));
      var e = Math.floor((i+1)  * ((data.length-1) / 5));

      var maxSignal = 0;
      var minSignal = 8;

      var posSignalCounter = {};
      var negSignalCounter = {};

      for (let j = s; j <= e; j++) {

        if (data[j].Date in signals) {
          if (spc.SignalEnum[signals[data[j].Date]].index < 4) {
            posSignalCounter[signals[data[j].Date]] = 1;
          } else {
            negSignalCounter[signals[data[j].Date]] = 1;
          }
          if (spc.SignalEnum[signals[data[j].Date]].index > maxSignal) {
            maxSignal = spc.SignalEnum[signals[data[j].Date]].index;
          }
          if (spc.SignalEnum[signals[data[j].Date]].index < minSignal) {
            minSignal = spc.SignalEnum[signals[data[j].Date]].index;
          }
        }
      }


      var containers = d3v45.selectAll("." + container).each( function (d,p) {
        var outerBbox = d3v45.select(this).select("." + container + "_" + cell).node().getBoundingClientRect();
        var ic = d3v45.select(this).select("." + container + "_" + cell).select(".iconContainer").attr("transform", "translate(1,1)");
        if (maxSignal > 3) {
          var bbox = d3v45.select(this).select("." + container + "_" + cell).select(".positiveChannel").node().getBoundingClientRect();
          var severity = map(maxSignal - 3, 1, 4, 0.5, 1);//0.7 * bbox.height, bbox.height);
          //(spc.SignalEnum[signals[data[j].Date]].index - 3) / 4 * bbox.height;
          var width = bbox.width;// - 2;
          var height = bbox.height;// - 2;
          ic.append("rect")
          .attr("x", i * (width / NUM_BINS) )
          .attr("y", 0.5 * (height - height * severity) )//bbox.height - (bbox.height / NUM_SIGNALS) - spc.SignalEnum[signals[data[j].Date]].index * (bbox.height / NUM_SIGNALS) )
          .attr("width", width / NUM_BINS)
          .attr("height", height * severity)//severity  )//(bbox.height / NUM_SIGNALS) )
          .attr("stroke-width", 0)
          .classed("spc__overSignal_fill", true)
          .attr("opacity", map(Object.keys(negSignalCounter).length, 0, 3, 0.4, 1));
        } else if (minSignal < 4){
          var bbox = d3v45.select(this).select("." + container + "_" + cell).select(".negativeChannel").node().getBoundingClientRect();
          var severity = map(4 - minSignal, 1, 4, 0.5, 1);//0.7 * bbox.height, bbox.height);
          //(4 - spc.SignalEnum[signals[data[j].Date]].index) / 4 * bbox.height;
          var width = bbox.width;// - 2;
          var height = bbox.height;// - 2;
          ic.append("rect")
          .attr("x", i * (width / NUM_BINS) )
          .attr("y", ( (1 / size - 1) * height ) + ( 0.5 * (height - height * severity) ) )//bbox.height - (bbox.height / NUM_SIGNALS) - spc.SignalEnum[signals[data[j].Date]].index * (bbox.height / NUM_SIGNALS) )
          .attr("width", width / NUM_BINS)
          .attr("height", height * severity)//severity  )//(bbox.height / NUM_SIGNALS) )
          .attr("stroke-width", 0)
          .classed("spc__underSignal_fill", true)
          .attr("opacity", map(Object.keys(posSignalCounter).length, 0, 3, 0.4, 1));
        }

      });
    }

  }

  processesAsBackgroundShade = function(container, cell, properties, data, minY, maxY, colourScale, colourAttribute = "", margin = 0, strokeWidth = 0.3, stroke = "#FFFFF8", meanLine = false, mlColour = "#999") {

    data.sort(function(a, b) {
      return a.Date - b.Date;
    });

    var minDate = data[0].Date;
    var maxDate = data[data.length-1].Date;
    var containers = d3v45.selectAll("." + container).each( function (d,i) {
      var bbox = d3v45.select(this).select("." + container + "_" + cell).node().getBoundingClientRect();
      var lastY  = -1;
      for (let p of properties.processes) {

        var sd = 0;
        if (p.startIndex - p.endIndex != 0) {
          sd = p.sd;
        }

        var x1 = map(data[p.startIndex].Date, minDate, maxDate, 1, bbox.width - 2);
        var x2 = map(data[p.endIndex].Date, minDate, maxDate, 1, bbox.width - 2);
        var y1 = map(p.mean + 3 * sd, maxY, minY, 1 + margin * bbox.height, (1 - margin) * (bbox.height - 2));
        var y2 = map(p.mean - 3 * sd, maxY, minY, 1 + margin * bbox.height, (1 - margin) * (bbox.height - 2));
        var y = map(p.mean, maxY, minY, 1 + margin * bbox.height, (1 - margin) * (bbox.height - 2));

        d3v45.select(this).select("." + container + "_" + cell).select(".iconContainer").append("rect")
        .attr("x", x1)
        .attr("y", y1)
        .attr("width", x2 - x1)
        .attr("height", (y2 - y1) )
        .attr("stroke", stroke)
        .attr("stroke-width", strokeWidth)
        .attr("fill", colourScale(colourAttribute) )
        //.attr("opacity", 0.3)
        //.classed(spc.SignalEnum[signals[data[j].Date]].index > 3 ? "spc__overSignal_fill" : "spc__underSignal_fill", true);
        if (meanLine) {
          d3v45.select(this).select("." + container + "_" + cell).select(".iconContainer").append("line")
          .attr("x1", x1)
          .attr("y1", y)
          .attr("x2", x2)
          .attr("y2", y)
          .attr("stroke", mlColour)
          .attr("stroke-width", 1)
          .attr("fill", colourScale(colourAttribute) )
          if (lastY > -1) {
            d3v45.select(this).select("." + container + "_" + cell).select(".iconContainer").append("line")
            .attr("x1", x1)
            .attr("y1", y)
            .attr("x2", x1)
            .attr("y2", lastY)
            .attr("stroke", mlColour)
            .attr("stroke-width", 1)
            .attr("fill", colourScale(colourAttribute) )
          }

          lastY = y;
        }


      }
    });
  }

  updateChartOpacity = function(container, o) {
    d3v45.selectAll("." + container).each( function (d,i) {
      d3v45.select(this).selectAll(".las").attr("opacity", o);
    });
  }



  drawLegend = function(container, type, colourScale) {
    var svg = d3v45.select("." + container).append("svg").attr("width", '100%')
    .attr("height", '100%');

    var width = d3v45.select("." + container).node().getBoundingClientRect().width;
    var height = d3v45.select("." + container).node().getBoundingClientRect().height;

    if (type == "discreet") {
      var numEntries = colourScale.domain().length;
      var boxH = height / numEntries;

      var c = 0;
      for (let i of colourScale.domain()) {

        svg.append("rect")
        .attr("x", 0)
        .attr("y", c * boxH)
        .attr("width", boxH)
        .attr("height", boxH)
        .attr("fill", colourScale(i))
        svg.append("text")
        .attr("x", boxH + 5)
        .attr("y", c * boxH + (0.5 * boxH))
        .attr("width", width - 5 - boxH)
        .attr("height", boxH)
        .attr("text-anchor", "start")
        .attr("dominant-baseline", "central")
        .text(i)
        c++;
      }
    } else if ( type == "continuous") {
      var boxW = 0.06 * width;

      var uuid = guid();
      var gradient = svg.append("defs")
      .append("linearGradient")
      .attr("id", uuid)
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "0%")
      .attr("y2", "100%")
      .attr("spreadMethod", "pad");

      gradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", colourScale(d3v45.max(colourScale.domain())))
      .attr("stop-opacity", 1);

      gradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", colourScale(d3v45.min(colourScale.domain())))
      .attr("stop-opacity", 1);

      svg.append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", boxW)
      .attr("height", height)
      .style("fill", "url(#" + uuid + ")");

      svg.append("text")
      .attr("x", boxW + 5)
      .attr("y", 0)
      .attr("width", width - 5 - boxW)
      .attr("height", boxW)
      .attr("text-anchor", "start")
      .attr("dominant-baseline", "text-before-edge")
      .text(d3v45.max(colourScale.domain()));

      svg.append("text")
      .attr("x", boxW + 5)
      .attr("y", height - 5)
      .attr("width", width - 5 - boxW)
      .attr("height", boxW)
      .attr("text-anchor", "start")
      .attr("dominant-baseline", "text-after-edge")
      .text(d3v45.min(colourScale.domain()));

    }
  }


  function guid() {
    function s4() {
      return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
  }

  map = function(value, low1, high1, low2, high2) {
    return low2 + (high2 - low2) * (value - low1) / (high1 - low1);
  }


  /**
  * Declare public functions
  */
  return {
    "drawGeo" :  drawGeo,
    "drawLegend" : drawLegend,
    "drawNMap" : drawNMap,
    "drawSMWG" : drawSMWG,
    "initalizeToolip" : initalizeToolip,
    "addSignalsAsColourOnly" : addSignalsAsColourOnly,
    "addSignalsAsIcons" : addSignalsAsIcons,
    "addSignalsAsGlyphs" : addSignalsAsGlyphs,
    "addSignalsAsGlyphsAngleAsMean" : addSignalsAsGlyphsAngleAsMean,
    "addSignalsAsTemporalGrid" : addSignalsAsTemporalGrid,
    "updateChartOpacity" : updateChartOpacity,
    "processesAsBackgroundShade" : processesAsBackgroundShade,
    "version" : version,
    "addSignalsAsTrendChannel" : addSignalsAsTrendChannel
  }






  //
  // d3v45.tsv("data/west-mids-smwg.tsv", function(error, data) {
  //

  //   ;
  // });
}();
