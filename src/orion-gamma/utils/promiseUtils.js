
module.exports.MaybeDo = (res, project, tactic) => {
    if (null == res) {
        return tactic(project);
    } else {
        return res;
    }
};

module.exports.PassThrough = fn => d => {
    fn(d);
    return d;
};


module.exports.ForEach = fn => d => {
    var promises = [];
    d.forEach( (e) => {
        promises.push(fn(e));
    });

    return Promise.all(promises);
};
