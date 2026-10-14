import * as THREE from 'three';

// Evidence capture of actual scene geometry. Never changes authored geometry/Z.
export function captureOrthographic(renderer, scene, layerMap, { bbox, layers, width=1024, height=1024, outlineLayers={}, lineLayers=[] }) {
  if (!Array.isArray(bbox) || bbox.length!==4 || !bbox.every(Number.isFinite) || bbox[2]<=bbox[0] || bbox[3]<=bbox[1]) throw new Error('Invalid local capture bbox');
  if (!Array.isArray(layers) || !layers.length || layers.some(name=>!layerMap[name])) throw new Error('Unknown capture layer');
  const selected=layers.map(name=>layerMap[name]);
  const visibility=scene.children.map(object=>[object,object.visible]);
  const selectedVisibility=selected.map(object=>[object,object.visible]);
  const bounds=new THREE.Box3();selected.forEach(object=>bounds.union(new THREE.Box3().setFromObject(object)));
  if (bounds.isEmpty()) throw new Error('Capture layers are empty');
  const size=renderer.getSize(new THREE.Vector2()),pixelRatio=renderer.getPixelRatio(),background=scene.background;
  const camera=new THREE.OrthographicCamera(bbox[0],bbox[2],bbox[3],bbox[1],0.1,Math.max(100, bounds.max.z-bounds.min.z+100));
  camera.position.set(0,0,bounds.max.z+50);camera.up.set(0,1,0);camera.lookAt(0,0,bounds.max.z);
  const evidenceLines=new THREE.Group();
  try {
    scene.updateMatrixWorld(true);
    for(const [name,color] of Object.entries(outlineLayers)) {
      if(!layers.includes(name))throw new Error('Outline layer must be selected');
      layerMap[name].traverse(object=>{
        if(!object.isMesh)return;
        const geometry=new THREE.EdgesGeometry(object.geometry);geometry.applyMatrix4(object.matrixWorld);
        evidenceLines.add(new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color,depthTest:false})));
      });
    }
    for(const {paths,color} of lineLayers)for(const path of paths) {
      if(path.length<2 || path.some(p=>p.length!==3 || !p.every(Number.isFinite)))throw new Error('Invalid local control line');
      const geometry=new THREE.BufferGeometry().setFromPoints(path.map(p=>new THREE.Vector3(...p)));
      evidenceLines.add(new THREE.Line(geometry,new THREE.LineBasicMaterial({color,depthTest:false})));
    }
    for (const [object] of visibility) object.visible=object.isLight || selected.some(root=>{
      for(let ancestor=root;ancestor;ancestor=ancestor.parent)if(ancestor===object)return true;
      return false;
    });
    selected.forEach(object=>{object.visible=true;});
    Object.keys(outlineLayers).forEach(name=>{layerMap[name].visible=false;});
    scene.add(evidenceLines);
    scene.background=new THREE.Color(0xffffff);
    renderer.setPixelRatio(1);renderer.setSize(width,height,false);
    scene.updateMatrixWorld(true);renderer.render(scene,camera);
    return {bbox,layers,width,height,projection:'orthographic',north:'local +Y',outlineLayers,
      controlLineLayers:lineLayers.map(({name,color,paths})=>({name,color,paths:paths.length})),image:renderer.domElement.toDataURL('image/png')};
  } finally {
    scene.remove(evidenceLines);evidenceLines.traverse(object=>{object.geometry?.dispose();object.material?.dispose();});
    visibility.forEach(([object,visible])=>{object.visible=visible;});
    selectedVisibility.forEach(([object,visible])=>{object.visible=visible;});
    scene.background=background;renderer.setPixelRatio(pixelRatio);renderer.setSize(size.x,size.y,false);
  }
}
