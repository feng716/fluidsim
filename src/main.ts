const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d');
interface Coord{
    x : number; 
    y : number;
}
function mulVec(vec1 : Coord, n : number) {
    return {
        x : vec1.x*n,    
        y : vec1.y*n,
    }
}
function addVec(vec1 : Coord, vec2 : Coord) {
    return {
        x : vec1.x+vec2.x,
        y : vec1.y+vec2.y,
    }
}
function negVec(vec1 : Coord){
    return {
        x : -vec1.x,
        y : -vec1.y,
    }
}
function norm(vec : Coord){
    return Math.sqrt(vec.x*vec.x+vec.y*vec.y)
}
type Vec2 = Coord;
interface Pt{
    coord : Coord;
    force: Vec2;
    velocity: Vec2;
    density: number;
}
interface tag2index{
    hash : number;
    index : number;
}
const particleMass = 1;
const kernelRadius = 1;
const idealDensity = 5;
const stiffness = 150;
const miu = 3;
const particle : Pt[] = [];
let hashTable : tag2index[] = [];
let hashFirstIndex : number[] = []
let timestep = 0;
type WorldBounds = Coord;
function getHash(blockSize : number, wb : WorldBounds, input : Coord) : Coord{
    return {
        x: Math.floor(input.x / blockSize),
        y: Math.floor(input.y / blockSize),
    }
}
function getLinearIndex(blockSize : number, wb : WorldBounds, coordBlockCounts : Coord) : number | null{
    type HashCounts = Coord;
    if(coordBlockCounts.x >= 0 && coordBlockCounts.x < wb.x/blockSize && coordBlockCounts.y >= 0 && coordBlockCounts.y < wb.y/blockSize){
        const wbBlockCounts : HashCounts = {
                x: Math.floor(wb.x / blockSize),
                y: Math.floor(wb.y / blockSize),
            }
        return coordBlockCounts.y * wbBlockCounts.x + coordBlockCounts.x
    }
    return null;
}
function addHash(diff : Coord, hash : Coord){
    return {
        x : hash.x + diff.x,
        y : hash.y + diff.y,
    }
}
function poly6(r : number, h : number){
    let res = 0.0
    let r_len = r
    if (r_len <= h){
        let tmp = (h * h - r_len * r_len) / (h * h * h)
        res = 315 / (64 * Math.PI) * tmp * tmp * tmp
    }
    return res
}
function d_spiky(vec1 : Coord, h : number) : Coord{
    let res = {x : 0, y : 0}
    let r_len = norm(vec1)
    if(r_len<=h){
        let tmp = (h - r_len) / (h * h * h)
        res = mulVec(vec1, -45 / Math.PI * tmp * tmp / r_len)
    }
    return res;
}
function lap_viscosity(vec1 : Coord, h : number) : number{
    return 45 / (Math.PI * Math.pow(h, 6) ) * (h - norm(vec1))
}
function influencePtByNeighbor(particleDst : Pt,fn : (particleDst : Pt, particleSrc : Pt)=>void, blockSize : number, wb : WorldBounds){
    let dstHash : Coord = getHash(blockSize, wb, particleDst.coord)
    function forPtInBlock(index : number){
        for(let i = index != 0 ? hashFirstIndex[index - 1] : 0; i < hashFirstIndex[index]; i++){
            fn(particleDst, particle[hashTable[i].index])
        }
    }
    function lp(coord : Coord){
        let hash = getLinearIndex(blockSize, wb, addVec(dstHash, coord));
        if(hash!=null)
            forPtInBlock(hash)
    }
    lp({x: 0, y: 0})
    lp({x: -1, y: 0})
    lp({x: 0, y: -1})
    lp({x: -1, y: -1})
    lp({x: 1, y: 0})
    lp({x: 0, y: 1})
    lp({x: 1, y: 1})
    lp({x: -1, y: 1})
    lp({x: 1, y: -1})
} 
function debugBlock(wb :WorldBounds){
        for(let i = 1; i < 10; i++){
            ctx?.beginPath()
            ctx?.moveTo(0, i * 50)
            ctx?.lineTo(500, i * 50)
            ctx?.closePath()
            ctx?.stroke()
        }
        for(let i = 1; i < 10; i++){
            ctx?.beginPath()
            ctx?.moveTo(i * 50, 0)
            ctx?.lineTo(i * 50, 500)
            ctx?.closePath()
            ctx?.stroke()
        }
}
function addPt2ToPt1Pressure(particleDst : Pt, particleSrc : Pt){
    let pressurePt1 = stiffness * (particleDst.density - idealDensity);
    let pressurePt2 = stiffness * (particleSrc.density - idealDensity);
    pressurePt1 = pressurePt1 < 0 ? 0 : pressurePt1;
    pressurePt2 = pressurePt2 < 0 ? 0 : pressurePt2;
    let force : Coord = 
                mulVec(
                    d_spiky( addVec( particleSrc.coord, negVec(particleDst.coord)), kernelRadius),
                    particleMass * (pressurePt1/Math.pow(particleDst.density, 2) + pressurePt2 / Math.pow(particleSrc.density, 2)))
    if(particleDst != particleSrc){
        particleDst.force = addVec(
            particleDst.force, 
            force
        )
    }
}
function addPt2ToPt1Density(particleDst : Pt, particleSrc : Pt){
    particleDst.density += particleMass * poly6(norm(addVec(particleSrc.coord, negVec(particleDst.coord))), kernelRadius)
}
function addPt2toPt1Viscosity(particleDst : Pt, particleSrc : Pt){
    let force : Coord = 
        mulVec(
            addVec(particleSrc.velocity, negVec(particleDst.velocity)),
            1/particleDst.density * miu)
    particleDst.force = addVec(
        particleDst.force, 
        force
    )
    
}
function solve(dh : number, wb: WorldBounds, blockSize : number){
    hashFirstIndex = []
    hashTable.sort((a, b) => a.hash - b.hash)
    {
        let k = 0;
        for(let a = 0; a < wb.x*wb.y/blockSize/blockSize; a++){
            while(k < hashTable.length&&hashTable[k].hash == a) k++;
            hashFirstIndex.push(k)
        }
    }
    //calculate the density
    particle.map((value: Pt) => {
        value.density = 0
        influencePtByNeighbor(value, addPt2ToPt1Density, blockSize, wb)
    })
    //solve the force
    
    particle.map((value: Pt, index:number) => {
        value.force.x = 0
        value.force.y = 40 
        influencePtByNeighbor(value, addPt2ToPt1Pressure, blockSize, wb)
        influencePtByNeighbor(value, addPt2toPt1Viscosity, blockSize, wb)
        return value
    })

    //integrate the velocity
    particle.map((value: Pt, index:number) => {
        value.velocity.x += value.force.x / value.density * dh
        value.velocity.y += value.force.y / value.density * dh
        return value
    })
    
    hashTable = []
    //integrate the coord 
    particle.map((value: Pt, index:number) => {
        value.coord.x += value.velocity.x * dh
        value.coord.y += value.velocity.y * dh
        if(value.coord.x >= wb.x || value.coord.x < 0){
            value.velocity.x *=-0.5;
            value.coord.x = value.coord.x > 0 ? wb.x - .001 : .001
        }
        if(value.coord.y >= wb.y || value.coord.y < 0) {
            value.velocity.y *=-0.5;
            value.coord.y = value.coord.y > 0 ? wb.y - .001 : .001
        }
        let hash = getLinearIndex(blockSize, wb, getHash(blockSize, wb, value.coord));
        if(hash!=null)
            hashTable.push({
                index: index,
                hash: hash,
            })
        return value
    })
}
function drawCircle(coord : Coord, color : CanvasPattern | string | CanvasGradient){
    ctx?.beginPath()
    if(ctx){
        ctx.fillStyle = color
    }
    ctx?.arc(coord.x, coord.y, 5, 0, 360)
    ctx?.closePath()
    ctx?.fill()
}
function draw(particleData:Pt[], wb : WorldBounds){
    ctx?.clearRect(0, 0, wb.x, wb.y)
    for(let a of particleData){
        drawCircle(mulVec(a.coord, 50), `rgb(${a.density/idealDensity*255} 0 0)`)
    }
}
if(canvas != null && ctx != null){
    //initialization
    const canvasWidth = canvas.getAttribute("width");
    const canvasHeight = canvas.getAttribute("height");
    if(canvasWidth!=null&&canvasHeight!=null){
        const wb : WorldBounds = {
            x : parseInt(canvasWidth)/50,
            y : parseInt(canvasHeight)/50
        }
        for(let i = 0; i < 50; i++){
            for(let j = 0; j < 20; j++){
                const randomCoord = {
                    x : j / 10 * 3,
                    y : i * 0.2,
                }
                particle.push({
                    coord: randomCoord,
                    force: {
                        x: 0,
                        y: 0,
                    },
                    velocity: {
                        x: 0,
                        y: 0,
                    },
                    density: 0
                })
                let hash = getLinearIndex(1, wb, getHash(1, wb, randomCoord));
                if(hash!=null){
                    hashTable.push({
                        index: j + i * 20,
                        hash: hash,
                    })
                }
            }
        }
        
        
        function process(){
            solve(0.01, wb, 1)
            draw(particle, mulVec(wb, 50))
            requestAnimationFrame(process)
        }
        requestAnimationFrame(process)
    }
}