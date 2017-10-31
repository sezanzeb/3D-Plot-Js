import * as THREE from "three"

/**
 * called from within JsPlot3D.js class plot
 * @param {object} parent this
 * @param {object} df df
 * @param {object} colors {dfColors, hueOffset}
 * @param {object} columns {x1col, x2col, x3col}
 * @param {object} normalization {normalizeX1, normalizeX2, normalizeX3, x1frac, x2frac, x3frac, minX1, minX2, minX3, maxX1, maxX2, maxX3}
 * @param {object} appearance {keepOldPlot, barchartPadding, barSizeThreshold, dataPointSize}
 * @param {object} dimensions {xLen, yLen, zLen}
 * @private
 */
export default function scatterplot(parent, df, colors, columns, normalization, appearance, dimensions)
{    
    let dfColors = colors.dfColors
    
    let x1col = columns.x1col
    let x2col = columns.x2col
    let x3col = columns.x3col
    
    let x1frac = normalization.x1frac
    let x2frac = normalization.x2frac
    let x3frac = normalization.x3frac
    let minX1 = normalization.minX1
    let minX2 = normalization.minX2
    let minX3 = normalization.minX3
    
    let keepOldPlot = appearance.keepOldPlot
    let dataPointSize = appearance.dataPointSize

    let xLen = dimensions.xLen
    let yLen = dimensions.yLen
    let zLen = dimensions.zLen


    let isItValid = parent.IsPlotmeshValid("scatterplot")

    // dispose the old mesh if it is not used/valid anymore
    if(!keepOldPlot || !isItValid)
    {
        parent.disposePlotMesh()
        
        parent.plotmesh = new THREE.Group()
        parent.plotmesh.name = "scatterplot"
        parent.SceneHelper.scene.add(parent.plotmesh)
    }
    
    // laod the recently used material from the cache
    let material = parent.oldData.material

    // the material is created here
    if(material === null || !isItValid || (material !== null && material != dataPointSize))
    {

        // base64 created using tools/getBase64.html and tools/sprite.png
        let circle = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABAAQMAAACQp+OdAAAABlBMVEUAAAD///+l2Z/"+
        "dAAAAAXRSTlMAQObYZgAAAAFiS0dEAIgFHUgAAAAJcEhZcwAACxMAAAsTAQCanBgAAAAHdElNRQfhChkUDA4mTwuUAAAAHWlUWHR"+
        "Db21tZW50AAAAAABDcmVhdGVkIHdpdGggR0lNUGQuZQcAAACJSURBVCjPvZK7DcAgDESJUlAyAqMwGhktozACJUWEE+fQORJSlCp"+
        "ueJI/wnd27hHpwLuK7DcEkYqMCHJyxShBkVcoqEV1VGhoQltW6KNb+xfAhjE6iOABxSAAqkEENIMEON4gA/of8OU/8xbzprMas2I"+
        "Uk/Ka4LSAptAmGkcraa7ZzQPgSfBIECf/CnPyltYpaAAAAABJRU5ErkJggg=="
        // advantages over canvas: alpha pixels are not black. no need to redraw the circle

        let datapointSprite = new THREE.TextureLoader().load(circle)
        //let datapointSprite = new THREE.ImageUtils.loadTexture(circle)
        datapointSprite.needsUpdate = true
        // plot it using circle sprites

        datapointSprite.magFilter = THREE.NearestFilter
        datapointSprite.minFilter = THREE.NearestFilter


        // https:// github.com/mrdoob/three.js/issues/1625
        // alphaTest = 1 causes errors
        // alphaTest = 0.9 edgy picture
        // alphaTest = 0.1 black edges on the sprite
        // alphaTest = 0 not transparent infront of other sprites anymore
        // sizeAttenuation: false, sprites don't change size in distance and size is in px
        material = new THREE.PointsMaterial({
            size: dataPointSize,
            map: datapointSprite,
            transparent: true,
            alphaTest: 0.5,
            vertexColors: true,
            sizeAttenuation: true,
        })

        parent.oldData.material = material
    }

    let group = parent.plotmesh
    let geometry = new THREE.Geometry()

    for(let i = 0; i < df.length; i ++)
    {
        let vertex = new THREE.Vector3()
        vertex.x = df[i][x1col]
        vertex.y = df[i][x2col]
        vertex.z = df[i][x3col]

        // three.js handles invalid vertex already by skipping them
        geometry.vertices.push(vertex)
        geometry.colors.push(dfColors[i])
    }

    geometry.verticesNeedUpdate = true

    let newDataPointSprites = new THREE.Points(geometry, material)

    group.add(newDataPointSprites)
    
    // normalize
    parent.plotmesh.scale.set(xLen/x1frac,yLen/x2frac,zLen/x3frac)
    parent.plotmesh.position.set(-minX1/x1frac*xLen,-minX2/x2frac*yLen,-minX3/x3frac*zLen)

    parent.benchmarkStamp("made a scatterplot")
}