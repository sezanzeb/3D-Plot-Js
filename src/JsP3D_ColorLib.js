const THREE = require("three")


/**
 * converts a number to a heat color and returns a THREE.Color object
 * @param {number} value the number that should be converted to a heat color
 * @param {number} min maximum number present in your dataframe. Default -1
 * @param {number} max minimum number present in your dataframe. Default 1
 * @param {number} hueOffset 0 means no offset. 0.5 means red turns to turqoise. 1 means the offset is so large that red is red again.
 * @return THREE.Color object
 */
export function convertToHeat(value,min=-1,max=1,hueOffset=0)
{
    // set color boundaries so that the colors are heatmap like
    let upperColorBoundary = 0+hueOffset // equals red // what the highest value will get
    let lowerColorBoundary = 0.65+hueOffset // equals blue with a faint purple tone // what the lowest value will get

    value = parseFloat(value)
    value = (value-min)/(max-min) // normalize

    // heatmap
    // make sure all the colors are within the defined range
    value = value * (1 - lowerColorBoundary - (1-upperColorBoundary)) + lowerColorBoundary

    // return that color
    return new THREE.Color(0).setHSL(value,0.95,0.55)
}



/**
 * returns dfColors. An array, indexes are the same as the vertices of the
 * scatterplot in the geometry.vertices array. dfColors contains THREE.Color objects
 * (supports numbers or color strings (0x...,"#...","rgb(...)","hsl(...)"))
 * The parameters have the same names as in JsPlot3D.js. Just forward them to this function
 * @param {any[][]} df the dataframe without the headers
 * @param {*} colorCol 
 * @param {*} defaultColor 
 * @param {*} labeled 
 * @param {*} header 
 * @param {boolean} filterColor wether or not numbers should be filtered to a headmap
 * @param {*} hueOffset 
 * @param {*} oldLabelsMap 
 * @private
 */
export function getColorMap(df, colorCol, defaultColor, labeled, header, filterColor=true, hueOffset=0, labelColorMap={}, numberOfLabels=0)
{
    let dfColors = new Array(df.length) // array of THREE.Color objects that contain the individual color information of each datapoint in the same order as df
    
    let firstDataPointLine = 0
    if(header)
        firstDataPointLine = 1

    // validating the settings.
    // check for labeled == false, because getColorObjctFromAnyString is only important for unlabeled data.
    if(labeled == false && colorCol != -1 && getColorObjectFromAnyString(df[firstDataPointLine][colorCol]) == undefined)
    {

        // didn't work. try some stuff
        if(header == false && df.length >= 2)
        {
            console.warn("the column that is supposed to hold the color information (index "+colorCol+") contained an unrecognized "+
                "string (\""+df[0][colorCol]+"\"). \"labeled\" is set to "+labeled+", \"header\" is set to "+header+" "+
                "Now trying with header = true.")
            header = true
            firstDataPointLine = 1
        }
        
        if(getColorObjectFromAnyString(df[firstDataPointLine][colorCol]) == undefined)
        {
            // assume labels
            console.warn("the column that is supposed to hold the color information (index "+colorCol+") contained an unrecognized "+
                "string (\""+df[0][colorCol]+"\"). \"labeled\" is set to "+labeled+", \"header\" is set to "+header+" "+
                "Now assuming labeled = true.")
            labeled = true
        }
    }

    if(colorCol != -1) // does the user even want colors?
    {

        // also normalize the colors so that I can do hsl(clr/clrMax,100%,100%)
        // no need to check if it's numbers or not, because dfColors carries only numbers
        // Assume the first value. No worries about wether or not those are actually numbers, because if not the script below will take care
        let clrMax = df[firstDataPointLine][colorCol]
        let clrMin = df[firstDataPointLine][colorCol]
        
        // the following function just updates clrMax and clrMin, only available within the function that wraps this (getColorMap(...))
        let findHighestAndLowest = (value) =>
        {
            if(filterColor && colorCol != -1)
            {
                if(value > clrMax)
                    clrMax = value
                if(value < clrMin)
                    clrMin = value
            }
        }

        // now take care about if the user says it's labeled or not, if it's numbers, hex, rgb, hsl or strings
        // store it inside dfColors[i] if it (can be converted to a number)||(is already a number)

        // parameter. Does the dataset hold classes/labels?
        if(labeled) // get 0.6315 from 2.6351 or 0 from 2. this way check if there are comma values
        {

            //------------------------//
            //     string labeled     //
            //------------------------//
            // e.g. "group1" "group2" "tall" "small" "0" "1" "flower" "tree"

            // check the second line, because there might be headers accidentally in the first row
            if((df[firstDataPointLine][colorCol]+"").startsWith("rgb") ||
            (df[firstDataPointLine][colorCol]+"").startsWith("hsl") ||
            ((df[firstDataPointLine][colorCol]+"").startsWith("#") && df[0][colorCol].length === 7))
            {
                console.warn(df[0][colorCol]+" might be a color. \"labeled\" is set true. For the stored colors to show up, try \"labeled=false\"")
            }
            
            // count the ammount of labels here
            let label = ""
            for(let i = 0; i < df.length; i++)
            {
                label = df[i][colorCol] // read the label/classification
                if(labelColorMap[label] === undefined) // is this label still unknown?
                {
                    labelColorMap[label] = {}
                    labelColorMap[label].number = numberOfLabels // map it to an unique number
                    numberOfLabels ++ // make sure the next label gets a different number
                }
            }

            // how much distance between each hue:
            let hueDistance = 1/(numberOfLabels)
            for(let i = 0; i < dfColors.length; i++)
            {
                let label = df[i][colorCol]
                let color
                if(labelColorMap[label].color === undefined)
                {
                    color = new THREE.Color(0).setHSL(labelColorMap[label].number*hueDistance+hueOffset,0.95,0.55)
                    labelColorMap[label].color = color // store the label name together with the color
                }
                else
                {
                    color = labelColorMap[label].color
                }
                dfColors[i] = color
            }

            console.log(labelColorMap)

            // CASE 1 dfColors now contains labels
            return {labelColorMap,dfColors,numberOfLabels}
        }
        else
        {

            //------------------------//
            //       color code       //
            //------------------------//
            //#, rgb and hex

            // if it is a string value
            // check the second line, because there might be headers accidentally in the first row
            if(isNaN(parseFloat(df[firstDataPointLine][colorCol])))
            {
                filterColor = false // don't apply normalization and heatmapfilters to it

                // try to extract color information from the string
                // check the second line, because there might be headers accidentally in the first row
                if(getColorObjectFromAnyString(df[firstDataPointLine][colorCol]) != undefined)
                {
                    for(let i = 0; i < df.length; i++)
                    {
                        let clr = getColorObjectFromAnyString(df[i][colorCol])
                        if(clr === undefined)
                            clr = new THREE.Color(0)
                        
                        dfColors[i] = clr
                    }
                }

                // CASE 2 dfColors now contains colors created from RGB, # and HSL strings
                return {labelColorMap,dfColors,numberOfLabels: 0}
            }
            else
            {
                //------------------------//
                //         number         //
                //------------------------//
                // examples: 0x3a96cd (3839693) 0xffffff (16777215) 0x000000 (0)

                // it's a number. just copy it over and filter it to a heatmap
                
                for(let i = 0; i < df.length; i++)
                {
                    dfColors[i] = (df[i][colorCol])
                    if(!filterColor)
                        dfColors[i] = (df[i][colorCol])|0
                    else
                        findHighestAndLowest(dfColors[i]) // update clrMin and clrMax
                }

                // This is just a preparation for CASE 3 and CASE 4
            }
        }
        
        // manipulate the color
        if(filterColor) // if filtering is allowed (not the case for rgb, hsl and #hex values)
        {
            // now apply the filters and create a THREE color from the information stored in dfColors
            for(let i = 0;i < df.length; i++)
            {
                let color = dfColors[i]
                // store that color
                dfColors[i] = convertToHeat(color,clrMin,clrMax,hueOffset)
            }

            // CASE 3 dfColors now contains a heatmap
            return {labelColorMap,dfColors,numberOfLabels: 0}
        }
        else
        {
            for(let i = 0;i < df.length; i++)
            {
                let color = dfColors[i]
                // store that color
                dfColors[i] = getColorObjectFromAnyString(color)
            }

            // CASE 4 dfColors now contains many colors, copied from the dataframe
            return {labelColorMap,dfColors,numberOfLabels: 0}
        }
    }
    
    // colorCol is -1
    for(let i = 0; i < df.length; i++)
        dfColors[i] = getColorObjectFromAnyString(defaultColor)

    // CASE 5 dfColors now contains all the same color
    return {labelColorMap:{}, dfColors,numberOfLabels: 0}
}



/**
 * converts the param color to a THREE.Color object
 * @param {any} color examples: "rgb(0,0.5,1)" "hsl(0.3,0.4,0.7)" 0xff6600 "#72825a"
 */
export function getColorObjectFromAnyString(color)
{
    if(typeof(color) === "number")
        return new THREE.Color(color) // number work like this: 0xffffff = 16777215 = white. 0x000000 = 0 = black
        // numbers are supported by three.js by default

    if(typeof(color) != "number" && typeof(color) != "string")
        return console.error("getColorObjectFromAnyString expected String or Number as parameter but got "+typeof(color))

    // if the code reaches this point, color is a string probably
    color = color.toLocaleLowerCase()

    // if it can be parsed, parse it
    if(!isNaN(parseFloat(color)))
        return new THREE.Color(parseFloat(color))

    if(color.startsWith("rgb"))
    {
        
        return new THREE.Color(color)
        
        // native support by three.js (but make sure it's lowercase, which happens at the beginning of this function)
        // let clr = new THREE.Color(color)

        // failed? maybe it was e.g. 0.5 instead of 128
        /*if(clr.r == undefined) // There seems to be no way to know if the above failed
        {
            console.log("dude?")
            // remove "rgb", brackets and split it into an array of [r,g,b]
            let rgb = color.substring(4,color.length-1).split(",")

            // if it was rgba( instead of rgb(, remove the lost opening bracket:
            if(rgb[0].startsWith("("))
                rgb[0] = rgb[0].substring(1)

            clr = new THREE.Color(0).setRGB(parseFloat(rgb[0]),parseFloat(rgb[1]),parseFloat(rgb[2])) 
        }*/
    }
    else if(color.startsWith("#"))
    {
        // hex strings are supported by three.js right away
        return new THREE.Color(color)
    }
    else if(color.startsWith("hsl"))
    {
        // remove "hsl", brackets and split it into an array of [r,g,b]
        let hsl = color.substring(4,color.length-1).split(",")
        return new THREE.Color(0).setHSL(parseFloat(hsl[0]),parseFloat(hsl[1]),parseFloat(hsl[2]))
    }
    
    return undefined
}
