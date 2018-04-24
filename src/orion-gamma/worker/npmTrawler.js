var debug = require('debug')('orion-gamma:worker-npmTrawler');
var handlers = require('../utils/handlers');
var db = require('../db/db-setup');
var dbComponent = require('../db/npmComponents');
var dbKeyword = require('../db/keyword');
var dispatcher = require('../dispatcher');

var source = 'npm';
var npmHandler = handlers.getHandler(source);

var TRAWL_TRESHOLD=4; // comp(1) => keyw(2) => comp(3) => stop.

function dbStoreComponent(comp, trawlLevel) {
    return new Promise( (resolve, reject) => {
        if (0 === Object.keys(comp).length &&
            Object === comp.constructor) {
            reject('No data to work with');
        }

        let item = {
            name: comp.name,
            trawlLevel: trawlLevel,        
            description: comp.description,
            'dist-tags': comp['dist-tags'],
            homepage: comp.homepage,
            keywords: comp.keywords,
            // TODO
            // repository: {
            //     type:comp.repository.type,
            //     url:comp.repository.url
            // },
            versions: [],
            bugs: comp.bugs?comp.bugs.url:JSON.stringify(comp.bugs),
            license: comp.license,
            author: comp.author
        };

        Object.keys(comp.time).forEach( (t) => {
            item.versions.push({version:t,
                                time:comp.time[t],
                                gitHead:comp.versions[t]?comp.versions[t].gitHead:undefined
                               });            
        });
        
        dbComponent.findOneAndUpdate(
            {
                name:comp.name
            },
            item,
            {upsert:true},
            (err,res) => {
                if (err) {
                    debug('Error while storing component: ', err);
                    return reject(err);
                }

                return resolve(res);
            });        
    });
};

function dbStoreKeywords(keywords, trawlLevel) {
    return new Promise( (resolve, reject) => {
        let promises = [];
        keywords.forEach( (e) => {
            promises.push(
                dbKeyword
                    .findOne({name:e}, 'name trawlLevel count isTrawled')
                    .then( (result) => {
                        // debug('keyword %s: %o', e, result);
                        if (!result) {
                            result = {
                                name:e,
                                trawlLevel:trawlLevel,
                                count:1,
                                isTrawled:false
                            };
                        } else if (result.count) {
                            result.count++;                        
                        } else {
                            result.count = 1;
                        }
                        return result;
                    })
                    .then( (result) => {
                        return dbKeyword.findOneAndUpdate(
                            {
                                name:result.name
                            },
                            result,
                            {upsert:true},
                            (err, res) => {
                                if (err) {
                                    debug('Error while updating keyword: ', err);
                                    return reject(err);
                                }

                                return resolve(res);
                            });
                    })
            );
        });

        Promise.all(promises)
            .catch( (err) => {
                debug('Error while storing keyword: %s', err);
                return reject(err);
            });
    });
}

function extractKeywords(item){
    return item.keywords || [];
}

function dispatchKeywords(keywords, trawlLevel) {
    return new Promise ( (resolve, reject) => {
        let promises = [];
        keywords.forEach( (e) => {
            let kw = {
                name:e,
                trawlLevel:trawlLevel+1
            };
            promises.push( dispatcher.push(dispatcher.config.queues.keywords, JSON.stringify(kw)) );
        });
        
        Promise.all(promises)
            .catch( (err) => {
                debug('Error while dispatching keywords: ', err);
                return reject(err);
            });

        return resolve(keywords);
    });
}

module.exports.trawlComponent = (item, trawlLevel = 1) => {
    return new Promise( (resolve, reject) => {        
        if (trawlLevel >= TRAWL_TRESHOLD) {
            debug('Reached Treshold, not trawling component %s', item.name);
            return resolve();
        }

        debug('Trawling component %s', item.name);    
        var getDetails = new Promise( (resolve, reject) => {
            npmHandler.getRawDetails(item.name, (err, res) => {
                if (err) {
                    return reject(err);
                } else {
                    return resolve(res);
                }
            });           
        });
        
        getDetails
            .then( result => {
                let keywords = extractKeywords(result);            
                
                dbStoreComponent(result, trawlLevel)
                    .then( () => { return dbStoreKeywords(keywords, trawlLevel); })
                    .then( () => { return dispatchKeywords(keywords, trawlLevel); });
                return result;
            })
            .catch(err => {
                debug(err);
                return reject(err);
            });
        
        return resolve();
    });
};


function dbFindKeyword(kw) {
    return dbKeyword.find({name : kw.name});
};

function dbUpdateKeywordTrawlStatus(kw) {
    return dbKeyword.findByIdAndUpdate(kw._id, {$set: {isTrawled:true}}, {new:true});
};

function keywordSearch(kw) {
    return new Promise( (resolve, reject) => {
        npmHandler.search(kw.name, (err, result) => {
            if (err) {
                return reject(err);
            }

            debug('Keyword search for %s returned %d results', kw.name, result.length);
            return resolve(result);
        });                  
    });
};

function dispatchComponents(components, trawlLevel) {
    return new Promise( (resolve, reject) => {
        debug(components[0]);

        let promises = [];        
        components.forEach( (e) => {
            e.trawlLevel = trawlLevel;
            promises.push( dispatcher.push(dispatcher.config.queues.components, JSON.stringify(e)) );
        });

        Promise.all(promises)
            .catch( (err) => {
                debug('Error while dispatching keywords: ', err);
                return reject(err);
            });
        
        resolve(components);
    });
};

module.exports.trawlKeyword = (item, trawlLevel = 1) => {
    return new Promise( (resolve, reject) => {
        if (trawlLevel >= TRAWL_TRESHOLD) {
            debug('Reached Treshold, not trawling keyword %s', item.name);
            return resolve();
        }

        dbFindKeyword(item)
            .then( (res) => {
                if (res[0].isTrawled) {
                    throw 'Keyword ' + res[0].name + ' is already tralwed';
                }
                return res[0];
            })
            .then( (res) => { debug('Trawling keyword %s', res.name); return res; })
            .then( (res) => { return dbUpdateKeywordTrawlStatus(res); })
            .then( (res) => { return keywordSearch(res); })
            .then( (res) => { return dispatchComponents(res, ++trawlLevel); })
            .catch((err) => {
                debug('ERROR KeywordTrawler %o', err);
                return reject(err);
            })
        ;


        return resolve();
    });
};
