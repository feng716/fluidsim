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
const particle : Pt[] = [];
const hashTable : tag2index[] = [];
const hashFirstIndex : number[] = []
let timestep = 0;
type WorldBounds = Coord;
function getLinearIndex(blockSize : number, wb : WorldBounds, input : Coord) : number{
    type HashCounts = Coord;
    const wbBlockCounts : HashCounts = {
        x: Math.floor(wb.x / blockSize),
        y: Math.floor(wb.y / blockSize),
    }
    const coordBlockCounts : HashCounts = {
        x: Math.floor(input.x / blockSize),
        y: Math.floor(input.y / blockSize),
    }
    return coordBlockCounts.y * wbBlockCounts.x + coordBlockCounts.x;
}
function poly6(r : number, h : number){
    if(r>h) return 0
    return 315/(64*Math.PI*Math.pow(h,3))*Math.pow((1-(r*r)/(h*h)),3)
}
function d_spiky(vec1 : Coord, h : number){
    let r = norm(vec1);
    return mulVec(vec1, -45/(Math.PI*Math.pow(h,6))*Math.pow((h-r),2)/r)
}
function influencePtByNeighbor(particleDst : Pt){
    
}
function addPt2ToPt1Density(particleDst : Pt, particleSrc : Pt){
    particleDst.density += poly6(norm(addVec(particleSrc.coord, particleDst.coord)), kernelRadius)
}
function solve(dh : number, wb: WorldBounds, blockCounts: number){
    //solve the force
    
    hashTable.sort((a, b) => a.hash - b.hash)
    {
        let k = 0;
        for(let a = 0; a < blockCounts; a++){
            while(hashTable[k].hash == a) k++;
            hashFirstIndex.push(k)
        }
    }
    
    particle.map((value: Pt, index:number) => {
        value.force.x = 0
        value.force.y = 0
        
        value.force.y += 98 

        
        return value
    })

    //integrate the velocity
    particle.map((value: Pt, index:number) => {
        if(value.coord.x > wb.x || value.coord.x < 0) value.velocity.x *=-0.9;
        if(value.coord.y > wb.y || value.coord.y < 0) value.velocity.y *=-0.9;
        value.velocity.x += value.force.x * dh
        value.velocity.y += value.force.y * dh
        return value
    })
    
    //integrate the coord 
    particle.map((value: Pt, index:number) => {
        value.coord.x += value.velocity.x * dh
        value.coord.y += value.velocity.y * dh
        return value
    })
}
function draw(particleData:Pt[], wb : WorldBounds){
    ctx?.clearRect(0, 0, wb.x, wb.y)
    for(let a of particleData){
        ctx?.beginPath()
        if(ctx) ctx.fillStyle = 'black'
        ctx?.arc(a.coord.x, a.coord.y, 5, 0, 360)
        ctx?.closePath()
        ctx?.fill()
    }
}
if(canvas != null && ctx != null){
    //initialization
    const canvasWidth = canvas.getAttribute("width");
    const canvasHeight = canvas.getAttribute("height");
    if(canvasWidth!=null&&canvasHeight!=null){
        const wb : WorldBounds = {
            x: parseFloat(canvasWidth),
            y: parseFloat(canvasHeight),
        }
        for(let i = 0; i < 10; i++){
            for(let j = 0; j < 10; j++){
                const randomCoord = {
                    x : Math.floor(Math.random() * wb.x),
                    y : Math.floor(Math.random() * wb.y),
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
                hashTable.push({
                    index: i * 10 + j,
                    hash: getLinearIndex(50, wb, randomCoord),
                })
            }
        }
        function process(){
            //solve(hashTable, 0.01, wb)
            draw(particle, wb)
            requestAnimationFrame(process)
        }
        requestAnimationFrame(process)
    }
}