// -*- coding: utf-8, tab-width: 2 -*-

import pathLib from 'path';

import absdir from 'absdir';
import mustBe from 'typechecks-pmb/must-be';
import prFs from 'nofs';
import objPop from 'objpop';


const dfOpt = {
  subBunRgx: /^[A-Za-z][\w\.\+\-]*(?=\.mjs$)/,
  subResType: 'bundle',
  paramKey: null,
};


function fileNameToOptKey(opt, fileName) {
  const m = opt.subBunRgx.exec(fileName);
  if (!m) { return false; }
  return m[opt.subBunMatchGroup || 0];
}


async function scanSubBunNames(subBunAbs, opt) {
  mustBe.nest('Absolute path to sub bundles', subBunAbs);
  const files = await prFs.readdir(subBunAbs);
  files.sort();
  const toOptKey = fileNameToOptKey.bind(null, opt);
  const optKeyNames = files.map(toOptKey).filter(Boolean);
  return optKeyNames;
}


function trueOrUndef(x) { return ((x === true) || (x === undefined)); }


function makeBob(subBunAbs, opt, defaultFeatureCfg) {
  let { paramKey } = opt;
  if (paramKey === null) { paramKey = pathLib.dirname(subBunAbs); }
  const subResType = (opt.subResType || 'bundle');

  let subBunNames;
  async function bob(bun) {
    const features = bun.makeParamPopper().mustBe('bool | dictObj', paramKey);
    if (features === false) { return; }
    if (!subBunNames) { subBunNames = await scanSubBunNames(subBunAbs, opt); }
    const specs = [];
    const popFeat = objPop(features);
    subBunNames.forEach(function decide(url) {
      const spec = { url };
      let p = popFeat(url);
      if (p === false) { return; }
      if (trueOrUndef(p)) { p = defaultFeatureCfg[url]; }
      if (!trueOrUndef(p)) { spec.param = { [url]: p }; }
      specs.push(spec);
    });
    popFeat.expectEmpty('Unknown sub bundle(s)');
    if (!specs.length) { return; }
    const preStage = (opt.prereqStages || false);
    if (preStage.length) { await bun.needs('stage', preStage); }
    await bun.needs(subResType, specs);
  }
  Object.assign(bob, {
    paramDefaults: { [paramKey]: defaultFeatureCfg },
    ...opt.extras,
  });
  return bob;
}

function makeBobFixParams(subBunDir, opt, defaultFeatureCfg) {
  const subBunAbs = absdir(subBunDir);
  const effOpt = { ...dfOpt, ...opt };
  const featCfg = (defaultFeatureCfg || {});
  return makeBob(subBunAbs, effOpt, featCfg);
}

export default makeBobFixParams;
