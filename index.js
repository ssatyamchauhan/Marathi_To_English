require("dotenv").config();
const express = require("express");
const bodyParser = require('body-parser');
const cors = require("cors");
const cheerio = require("cheerio");

const morgan = require('morgan');
const DEV_Mongodb = require("./library/mongodb");
const IGR_MONGODB = require("./library/IGR/mongodb");
var query = require('querystring');
const axios = require("axios").default;
const ObjectID = require('mongodb').ObjectID;
const app = express()
const PORT = process.env.PORT || 6000;
const table_name = "result_collections"
app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(morgan('dev'));


async function translate(text_to_en) {
    try {
        const text = query.escape(text_to_en);
        if (text_to_en != null && text_to_en) {
            const len = text_to_en.length;
            if (len > 300) {
                const chunks = [];
                for (let i = 0; i < len; i += 300) {
                    chunks.push(text_to_en.substring(i, i + 300));
                }

                let text_to_return = '';
                for (let chunk of chunks) {
                    const response = await axios.get(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=mr&tl=en&dt=t&q=${query.escape(chunk)}`)
                    if (response.status == 200 && response.data && response.data.length) {
                        if (response.data[0] != null) {
                            if (response.data[0].length) {
                                for (let __ of response.data[0]) { text_to_return += __[0] }
                            }
                        }
                    }
                }
                //                        console.log('Text_To_Return....',text_to_return)
                return text_to_return;
            } else {
                const response = await axios.get(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=mr&tl=en&dt=t&q=${text}`)
                if (response.status == 200 && response.data && response.data.length) {
                    if (response.data[0] != null) {
                        let text_to_return = '';
                        if (response.data[0].length) {
                            for (let __ of response.data[0]) { text_to_return += __[0] }
                            return text_to_return;
                        }
                        return null;
                    } else {
                        return null
                    }
                }
            }
        } else { return null }
    } catch (error) {
        console.error('Error While converting to English', error);
        //            throw Error(error);
        return text_to_en
    }
}

function isNumeric(num) {
    if (!num) { return false }
    return !isNaN(num)
}

async function htmltoJson(text_to_en) {
    //  console.log('text to htmltoJson', text_to_en)

    if (text_to_en != null) {
        // const $ = cheerio.load(text_to_en);
        // const tbody = await $("table.tblmargin > tbody > tr");
        // const dataObj = {};
        // const keys = ['DocType', 'Compensation', 'MarketPrice', 'SubDivisionHouseNo', 'Area', 'Levy', 'NameAndAddressPartyOfExecutingDocument', 'NameAndAddressOfDefedent', 'DocumentSubmissionDate', 'DateOfRegistrationDeed', 'SerialNumber', 'MarketRateStampDuty', 'MarketRateRegistrationFee', 'Shera', 'OtherDetails'];
        // let index = 0;
        // for (let el of tbody) {
        //     let data = $(el).children("td:nth-child(2)").text();
        //     dataObj[keys[index]] = await translate(data);
        //     index += 1
        // };
        // return dataObj;


        const dataObj = {};
        const $ = cheerio.load(text_to_en);
        const top_tbody = await $("body > table:nth-child(1) > tbody > tr > td:nth-child(3) > table > tbody > tr:nth-child(1)");
        const SecondaryRegistrar = $(top_tbody).children("td:nth-child(1)").text();
        if (SecondaryRegistrar) {
            const arr = SecondaryRegistrar.split(":");
            if (arr && arr.length > 1) {
                dataObj.SecondaryRegistrar = await translate(arr[1]);
            }
        }
        const Village_Name = await $("body > table:nth-child(2) > tbody > tr:nth-child(2) > td > p > font").text();

        if (Village_Name != null) {
            dataObj.VillageName = await translate(Village_Name);
        }


        const tbody = await $("table.tblmargin > tbody > tr");
        const keys = ['DocType', 'Compensation', 'MarketPrice', 'SubDivisionHouseNo', 'Area', 'Levy', 'NameAndAddressPartyOfExecutingDocument', 'NameAndAddressOfDefedent', 'DocumentSubmissionDate', 'DateOfRegistrationDeed', 'SerialNumber', 'MarketRateStampDuty', 'MarketRateRegistrationFee', 'Shera', 'OtherDetails', 'DetailsConsideredForAssessment'];
        let index = 0;
        for (let el of tbody) {
            let data = $(el).children("td:nth-child(2)").text();
            if (data) { data = data.trim() }
            //            console.log('isNumeric', isNumeric(data))
            if (keys[index] && !isNumeric(data)) {
                dataObj[keys[index]] = await translate(data);
            } else if (keys[index]) {
                dataObj[keys[index]] = data;
            }
            //dataObj[keys[index]] = await translate(data);
            index += 1
        };
        return dataObj
    } else {
        return null
    }
}

async function main() {
    try {
        const { Find, UpdateMany, TotalCount } = require("./library/IGR/methods");
        const { Insert } = require("./library/methods");
        // console.log(fullData);
        // return
        const Count = await TotalCount(table_name, { $or: [{ translated: { $exists: false } }, { translated: false }] });
        console.log('Total Data In FLASK_DB to be process...', Count);
        if (!Count) {
            console.log('No Data To Process...')
        } else {
            for (let count = parseInt(process.env.SKIP); count < Count; count += 10) { // parseInt(process.env.LIMIT)
                const fullData = await Find(table_name, { $or: [{ translated: { $exists: false } }, { translated: false }] }, count, 10, {});
                let dataToInsert = [];
                console.log('skip', count, 'limit', count + 10, dataToInsert.length)
                for (let d of fullData) {
                    // console.log('d',d.d_name)
                    if (d.district && d.district.length) {
                        const translate_district = await translate(d.district);
                        if (translate_district) {
                            d.district = translate_district;
                        }
                    }
                    if (d.tahsil && d.tahsil.length) {
                        const translate_tahsil = await translate(d.tahsil);
                        if (translate_tahsil) {
                            d.tahsil = translate_tahsil;
                        }
                    }
                    if (d.village && d.village.length) {
                        const translate_village = await translate(d.village);
                        if (translate_village) {
                            d.village = translate_village;
                        }
                    }
                    if (d.d_name && d.d_name.length) {
                        const translate_d_name = await translate(d.d_name);
                        if (translate_d_name) {
                            d.d_name = translate_d_name;
                        }
                    }
                    if (d.sro_name && d.sro_name.length) {
                        const translate_sro_name = await translate(d.sro_name);
                        if (translate_sro_name) {
                            d.sro_name = translate_sro_name;
                        }
                    }
                    if (d.seller_name && d.seller_name.length) {
                        const translate_seller_name = await translate(d.seller_name);
                        if (translate_seller_name) {
                            d.seller_name = translate_seller_name;
                        }
                    }
                    if (d.purchaser_name && d.purchaser_name.length) {
                        const translate_p_name = await translate(d.purchaser_name);
                        if (translate_p_name) {
                            d.purchaser_name = translate_p_name;
                        }
                    }
                    // property_description
                    if (d.property_description && d.property_description.length) {
                        const translate_property_description = await translate(d.property_description);
                        if (translate_property_description) {
                            d.property_description = translate_property_description;
                        }
                    }
                    if (d.pdf_data && d.pdf_data.length) {
                        const translatedoc_html = await htmltoJson(d.pdf_data);
                        if (translatedoc_html) {
                            d.pdf_data = translatedoc_html;
                        }
                    }

                    if (d.doc_html && d.doc_html.length) {
                        const translatedoc_html = await htmltoJson(d.doc_html);
                        if (translatedoc_html) {
                            d.pdf_data = translatedoc_html;
                        }
                    }
                    if (d.Index && d.Index.length) {
                        const translatedoc_html = await htmltoJson(d.Index);
                        if (translatedoc_html) {
                            d.Index = translatedoc_html;
                        }
                    }

                    if (d?.input?.tahsil && d?.input?.tahsil.length) {
                        const translate_property_description = await translate(d.input.tahsil);
                        if (translate_property_description) {
                            d.input.tahsil = translate_property_description;
                        }
                    }

                    if (d?.input?.Village && d?.input?.Village.length) {
                        const translate_property_description = await translate(d.input.Village);
                        if (translate_property_description) {
                            d.input.Village = translate_property_description;
                        }
                    }


                    if (d?.input?.district && d?.input?.district?.length) {
                        const translate_property_description = await translate(d.input.district);
                        if (translate_property_description) {
                            d.input.district = translate_property_description;
                        }
                    }

                    if (d.DName && d.DName.length) {
                        const translate_property_description = await translate(d.DName);
                        if (translate_property_description) {
                            d.DName = translate_property_description;
                        }
                    }

                    if (d.SROName && d.SROName.length) {
                        const translate_property_description = await translate(d.SROName);
                        if (translate_property_description) {
                            d.SROName = translate_property_description;
                        }
                    }

                    if (d['Seller Name'] && d['Seller Name'].length) {
                        const translate_property_description = await translate(d['Seller Name']);
                        if (translate_property_description) {
                            d.SellerName = translate_property_description;
                        }
                    }

                    if (d['Purchaser Name'] && d['Purchaser Name'].length) {
                        const translate_property_description = await translate(d['Purchaser Name']);
                        if (translate_property_description) {
                            d.PurchaserName = translate_property_description;
                        }
                    }

                    if (d['Property Description'] && d['Property Description'].length) {
                        const translate_property_description = await translate(d['Property Description']);
                        if (translate_property_description) {
                            d.PropertyDescription = translate_property_description;
                        }
                    }

                    if (d?.additional_data && d?.additional_data.length && Array.isArray(d.additional_data)) {
                        //                   const arr = [];
                        const additional_data = d.additional_data;
                        for (let d of additional_data) {

                            if (d.DName && d.DName.length) {
                                const translate_property_description = await translate(d.DName);
                                if (translate_property_description) {
                                    d.DName = translate_property_description;
                                }
                            }

                            if (d.SROName && d.SROName.length) {
                                const translate_property_description = await translate(d.SROName);
                                if (translate_property_description) {
                                    d.SROName = translate_property_description;
                                }
                            }

                            if (d['Seller Name'] && d['Seller Name'].length) {
                                const translate_property_description = await translate(d['Seller Name']);
                                if (translate_property_description) {
                                    d.SellerName = translate_property_description;
                                }
                            }

                            if (d['Purchaser Name'] && d['Purchaser Name'].length) {
                                const translate_property_description = await translate(d['Purchaser Name']);
                                if (translate_property_description) {
                                    d.PurchaserName = translate_property_description;
                                }
                            }

                            if (d['Property Description'] && d['Property Description'].length) {
                                const translate_property_description = await translate(d['Property Description']);
                                if (translate_property_description) {
                                    d.PropertyDescription = translate_property_description;
                                }
                            }

                            if (d.Index && d.Index.length) {
                                const translatedoc_html = await htmltoJson(d.Index);
                                if (translatedoc_html) {
                                    d.Index = translatedoc_html;
                                }
                            }
                            //                  arr.push(d);

                        }
                        //                 d.resultarr = arr;
                    }

                    if (d?.results && d?.results?.length && Array.isArray(d.results)) {
                        //                   const arr = [];
                        const results = d.results;
                        for (let d of results) {

                            if (d.DName && d.DName.length) {
                                const translate_property_description = await translate(d.DName);
                                if (translate_property_description) {
                                    d.DName = translate_property_description;
                                }
                            }

                            if (d.SROName && d.SROName.length) {
                                const translate_property_description = await translate(d.SROName);
                                if (translate_property_description) {
                                    d.SROName = translate_property_description;
                                }
                            }

                            if (d['Seller Name'] && d['Seller Name'].length) {
                                const translate_property_description = await translate(d['Seller Name']);
                                if (translate_property_description) {
                                    d.SellerName = translate_property_description;
                                }
                            }

                            if (d['Purchaser Name'] && d['Purchaser Name'].length) {
                                const translate_property_description = await translate(d['Purchaser Name']);
                                if (translate_property_description) {
                                    d.PurchaserName = translate_property_description;
                                }
                            }

                            if (d['Property Description'] && d['Property Description'].length) {
                                const translate_property_description = await translate(d['Property Description']);
                                if (translate_property_description) {
                                    d.PropertyDescription = translate_property_description;
                                }
                            }

                            if (d.Index && d.Index.length) {
                                const translatedoc_html = await htmltoJson(d.Index);
                                if (translatedoc_html) {
                                    d.Index = translatedoc_html;
                                }
                            }
                            //                  arr.push(d);

                        }
                        //                 d.resultarr = arr;
                    }

                    const da = { ...d };
                    delete da._id;
                    /*                if (d.d_name && d.d_name.length) {
                    //                    const translate_d_name = await translate(d.d_name);
                                        if (translate_d_name) {
                                            d.d_name = translate_d_name;
                                        }
                                    }
                                    if (d.doc_html && d.doc_html.length) {
                                        const translatedoc_html = await htmltoJson(d.doc_html);
                                        if (translatedoc_html) {
                                            d.doc_html = translatedoc_html;
                                        }
                                    }
                    
                    
                                    if (d.input && Object.keys(d.input).length) {
                                        const sro_name_en = await translate(d.input.sro_name)
                                        if (sro_name_en) {
                                            d.input.sro_name = sro_name_en
                                        }
                    
                                        const d_name_en = await translate(d.input.d_name);
                                        if (d_name_en) {
                                            d.input.d_name = d_name_en;
                                        }
                    
                                        const property_description_en = await translate(d.input.property_description)
                                        if (property_description_en) {
                                            d.input.property_description = property_description_en
                                        }
                    
                                        const purchaser_name_en = await translate(d.input.purchaser_name);
                                        if (purchaser_name_en) {
                                            d.input.purchaser_name = purchaser_name_en
                                        }
                                        const seller_name_en = await translate(d.input.seller_name);
                                        if (seller_name_en) {
                                            d.input.seller_name = seller_name_en;
                                        } */

                    //                }

                    dataToInsert.push(da);
                }
                const ids = fullData.map((obj) => obj._id);
                await Insert(table_name, dataToInsert);
                await UpdateMany(table_name, { _id: { $in: ids } }, { translated: true });
            }
        }

        setTimeout(main, 10000) // function calling itself
    } catch (error) {
        console.error('Error in main function', error);
    }
}

DEV_Mongodb().then((db) => {
    IGR_MONGODB().then(() => {
        app.listen(PORT, () => {
            main()
            console.info("You App is listening", `http://localhost:${PORT}`)
        })
    }).catch((error) => console.error('Error Connection IGR DB....', error));
}).catch((error) => { console.error('Error Connecting DEV_MONGODB', error) })
