// ============================================================================
// دروب (Droob) — TripPlannerScreen
// Origin/Dest + search drawer + time selector + mode filters + JourneyCards
// Production-quality RTL, native animations, full token integration
// ============================================================================

import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, FlatList } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown, Layout } from "react-native-reanimated";
import { colors, radius, spacing, fontSize, fontWeight, shadows } from "@theme/tokens";
import type { TransitMode } from "@theme/tokens";
import type { Journey } from "@types/transit";
import { BottomSheet, type BottomSheetRef } from "@components/BottomSheet";
import { TransitBadge } from "@components/TransitBadge";
import { CountdownTimer } from "@components/CountdownTimer";

const MODES: { key: TransitMode; icon: string; label: string }[] = [
  { key:"city_bus", icon:"🚌", label:"باص" },
  { key:"brt", icon:"⚡", label:"BRT" },
  { key:"serveece", icon:"🚐", label:"سرفيس" },
  { key:"intercity", icon:"🚍", label:"خطوط" },
];
const MODE_COLORS: Record<string,string> = { city_bus:colors.bus_city, brt:colors.bus_brt, serveece:colors.serveece, intercity:colors.intercity };

const MOCK_JOURNEYS: Journey[] = [{
  id:"j1", legs:[
    { mode:"walking" as any, routeId:null, routeCode:null, routeNameAr:null, routeNameEn:null, routeColor:null,
      fromStop:{ id:"u",nameAr:"موقعك",nameEn:"You",code:"",lat:31.95,lng:35.93,modes:[],isLandmark:false,isAccessible:false },
      toStop:{ id:"g1",nameAr:"محطة الجاردنز",nameEn:"Gardens",code:"G01",lat:31.975,lng:35.885,modes:["brt"],isLandmark:true,isAccessible:true },
      departureTime:"09:00", arrivalTime:"09:04", duration_min:4, distance_km:0.3, polyline:[], fare_jod:0, headway_min:null, vehicleOccupancy:null,
      instructionsAr:"امش 4 دقائق إلى محطة الجاردنز", instructionsEn:"Walk 4 min to Gardens" },
    { mode:"brt" as any, routeId:"brt1", routeCode:"BRT1", routeNameAr:"الباص السريع 1", routeNameEn:"BRT Line 1", routeColor:colors.bus_brt,
      fromStop:{ id:"g1",nameAr:"محطة الجاردنز",nameEn:"Gardens",code:"G01",lat:31.975,lng:35.885,modes:["brt"],isLandmark:true,isAccessible:true },
      toStop:{ id:"d1",nameAr:"دوار الداخلية",nameEn:"Dakhiliya",code:"D05",lat:31.96,lng:35.91,modes:["brt"],isLandmark:true,isAccessible:true },
      departureTime:"09:08", arrivalTime:"09:20", duration_min:12, distance_km:4.2, polyline:[], fare_jod:0.55, headway_min:10, vehicleOccupancy:"partial",
      instructionsAr:"اركب BRT1 من محطة الجاردنز", instructionsEn:"Board BRT1 at Gardens" },
    { mode:"walking" as any, routeId:null, routeCode:null, routeNameAr:null, routeNameEn:null, routeColor:null,
      fromStop:{ id:"d1",nameAr:"دوار الداخلية",nameEn:"Dakhiliya",code:"D05",lat:31.96,lng:35.91,modes:["brt"],isLandmark:true,isAccessible:true },
      toStop:{ id:"dest",nameAr:"العبدلي",nameEn:"Abdali",code:"",lat:31.962,lng:35.908,modes:[],isLandmark:false,isAccessible:false },
      departureTime:"09:20", arrivalTime:"09:25", duration_min:5, distance_km:0.4, polyline:[], fare_jod:0, headway_min:null, vehicleOccupancy:null,
      instructionsAr:"امش 5 دقائق إلى العبدلي", instructionsEn:"Walk 5 min to Abdali" },
  ], totalDurationMinutes:25, walkingMinutes:9, transfers:0, fareAmount:0.55, fareCurrency:"JOD",
  departureTime:"09:00", arrivalTime:"09:25", modes:["brt"] },
];

/** Location Fields */
const LocationFields: React.FC<{ from:string; to:string; onSwap:()=>void; onFrom:()=>void; onTo:()=>void }> = ({ from,to,onSwap,onFrom,onTo }) => (
  <View style={st.locWrap}>
    <View style={st.locRow}>
      <View style={[st.locDot,{backgroundColor:colors.on_time}]} />
      <TouchableOpacity style={st.locField} onPress={onFrom}><Text style={[st.locText,!from&&st.locPh]} numberOfLines={1}>{from||"نقطة الانطلاق"}</Text></TouchableOpacity>
    </View>
    <View style={st.locLine}>
      <TouchableOpacity style={st.swap} onPress={onSwap} activeOpacity={0.7}><Text style={st.swapIcon}>⇅</Text></TouchableOpacity>
    </View>
    <View style={st.locRow}>
      <View style={[st.locDot,{backgroundColor:colors.brand_blue}]} />
      <TouchableOpacity style={st.locField} onPress={onTo}><Text style={[st.locText,!to&&st.locPh]} numberOfLines={1}>{to||"الوجهة"}</Text></TouchableOpacity>
    </View>
  </View>
);

/** Time Selector */
const TimeSelector: React.FC<{ active:string; onChange:(v:string)=>void }> = ({ active,onChange }) => {
  const opts = { now:"الآن", depart:"أغادر في ▾", arrive:"أصل في ▾" };
  return (
    <View style={st.timeRow}>
      {Object.entries(opts).map(([k,label]) => {
        const isA = active===k;
        return (
          <TouchableOpacity key={k} style={[st.timePill,isA&&st.timePillA]} onPress={()=>onChange(k)}>
            <Text style={[st.timePillT,isA&&st.timePillTA]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

/** Mode Filters */
const ModeFilters: React.FC<{ sel:TransitMode[]; onToggle:(m:TransitMode)=>void }> = ({ sel,onToggle }) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.modeScroll} style={{flexDirection:"row-reverse"}}>
    {MODES.map(({key,icon,label})=>{
      const s = sel.includes(key);
      return (
        <TouchableOpacity key={key} style={[st.modeChip,s&&{borderColor:MODE_COLORS[key],backgroundColor:MODE_COLORS[key]+"18"}]} onPress={()=>onToggle(key)}>
          <Text style={st.modeIcon}>{icon}</Text>
          <Text style={[st.modeL,s&&{color:MODE_COLORS[key]}]}>{label}</Text>
        </TouchableOpacity>
      );
    })}
    <TouchableOpacity style={st.modeChip}><Text style={st.modeIcon}>♿</Text></TouchableOpacity>
  </ScrollView>
);

/** JourneyCard */
const JourneyCard: React.FC<{ journey:Journey; sel:boolean; onPress:()=>void }> = React.memo(({ journey,sel,onPress }) => {
  const ms = [...new Set(journey.legs.filter(l=>l.mode!=="walking").map(l=>l.mode))];
  return (
    <TouchableOpacity style={[st.jCard,sel&&st.jCardSel]} onPress={onPress} activeOpacity={0.7}>
      <View style={st.jHead}>
        <View style={st.jModes}>{ms.map(m=><TransitBadge key={m} mode={m as TransitMode} size="sm"/>)}</View>
        <View style={st.jMeta}><Text style={st.jDur}>{journey.totalDurationMinutes} دق</Text>{journey.fareAmount!=null&&<Text style={st.jFare}>{journey.fareAmount} د.أ</Text>}</View>
      </View>
      <View style={st.jLegs}>
        {journey.legs.map((leg,i)=>(
          <View key={i} style={st.jLeg}>
            <View style={st.jLegDot} />{i<journey.legs.length-1&&<View style={st.jLegLine} />}
            <Text style={st.jLegT} numberOfLines={2}>{leg.instructionsAr}</Text>
          </View>
        ))}
      </View>
      <View style={st.jFoot}>
        <CountdownTimer minutes={4} size="sm"/>
        <TouchableOpacity style={st.jStart}><Text style={st.jStartT}>ابدأ التنقل ←</Text></TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
});

// ─── MAIN ───────────────────────────────────────────────────────────────────

const TripPlannerScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [from,setFrom]=useState(""); const [to,setTo]=useState("");
  const [tm,setTm]=useState("now");
  const [modes,setModes]=useState<TransitMode[]>(["city_bus","brt","serveece","intercity"]);
  const [sel,setSel]=useState<string|null>(null);
  const [showSearch,setShowSearch]=useState(false);
  const [st,setST]=useState<"from"|"to">("from");
  const [journeys]=useState(MOCK_JOURNEYS);

  const swap = useCallback(()=>{ setFrom(p=>{const n=to;setTo(p);return n}); },[to]);
  const toggleM = useCallback((m:TransitMode)=>{ setModes(p=>p.includes(m)?p.filter(x=>x!==m):[...p,m]); },[]);

  return (
    <View style={[st.root,{paddingTop:insets.top+8}]}>
      <Text style={st.title}>مخطط الرحلة</Text>
      <LocationFields from={from} to={to} onSwap={swap}
        onFrom={()=>{setST("from");setShowSearch(true);}} onTo={()=>{setST("to");setShowSearch(true);}} />
      <TimeSelector active={tm} onChange={setTm} />
      <ModeFilters sel={modes} onToggle={toggleM} />
      <FlatList
        data={journeys} keyExtractor={j=>j.id}
        contentContainerStyle={st.list}
        ListHeaderComponent={<Text style={st.resCount}>{journeys.length} نتيجة</Text>}
        renderItem={({item})=>(
          <Animated.View entering={FadeInDown.duration(300)} layout={Layout.springify()}>
            <JourneyCard journey={item} sel={sel===item.id} onPress={()=>setSel(item.id)}/>
          </Animated.View>
        )}
        ListEmptyComponent={<Text style={st.empty}>لا توجد نتائج. جرب وقتاً مختلفاً.</Text>}
      />
      {showSearch && (
        <BottomSheet snapPoints={[0.92]} initialIndex={0} showBackdrop onSnapChange={(i)=>{if(i>0)setShowSearch(false);}}>
          <View style={st.sd}>
            <TextInput style={st.sdIn} placeholder="ابحث عن محطة..." placeholderTextColor={colors.text_tertiary} textAlign="right" autoFocus/>
            <TouchableOpacity style={st.ulBtn}><Text style={st.ulIcon}>📍</Text><Text style={st.ulT}>استخدم موقعي الحالي</Text></TouchableOpacity>
            <Text style={st.sdTitle}>آخر عمليات البحث</Text>
            {["محطة الجاردنز","دوار الداخلية","مجمع الشمال"].map((s,i)=>(
              <TouchableOpacity key={i} style={st.sr} onPress={()=>{if(st==="from")setFrom(s);else setTo(s);setShowSearch(false);}}>
                <Text style={st.srT}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </BottomSheet>
      )}
    </View>
  );
};

// ─── Styles ─────────────────────────────────────────────────────────────────

const st = StyleSheet.create({
  root:{flex:1,backgroundColor:colors.surface},
  title:{fontFamily:"IBM Plex Sans Arabic",fontSize:fontSize[24],fontWeight:fontWeight.bold,color:colors.text_primary,paddingHorizontal:16,marginBottom:12},
  // Location
  locWrap:{paddingHorizontal:16,marginBottom:12},
  locRow:{flexDirection:"row",alignItems:"center"},
  locDot:{width:8,height:8,borderRadius:4,marginRight:12},
  locField:{flex:1,height:52,backgroundColor:colors.surface_2,borderRadius:radius.card,justifyContent:"center",paddingHorizontal:16},
  locText:{fontFamily:"IBM Plex Sans Arabic",fontSize:fontSize[15],color:colors.text_primary,textAlign:"right"},
  locPh:{color:colors.text_tertiary},
  locLine:{width:2,marginLeft:15,height:24,borderLeftWidth:2,borderColor:colors.border,borderStyle:"dashed",justifyContent:"center"},
  swap:{position:"absolute",right:-18,width:36,height:36,borderRadius:18,backgroundColor:colors.surface,alignItems:"center",justifyContent:"center",...shadows.sm},
  swapIcon:{fontSize:16,color:colors.brand_blue},
  // Time
  timeRow:{flexDirection:"row",paddingHorizontal:16,gap:8,marginBottom:12},
  timePill:{flex:1,height:36,borderRadius:radius.pill,backgroundColor:colors.surface_2,alignItems:"center",justifyContent:"center"},
  timePillA:{backgroundColor:colors.brand_blue},
  timePillT:{fontFamily:"IBM Plex Sans Arabic",fontSize:fontSize[14],fontWeight:fontWeight.medium,color:colors.text_secondary},
  timePillTA:{color:"#fff"},
  // Modes
  modeScroll:{paddingHorizontal:16,gap:8,marginBottom:12},
  modeChip:{flexDirection:"row",alignItems:"center",height:32,paddingHorizontal:12,borderRadius:radius.pill,borderWidth:1.5,borderColor:colors.border,gap:4},
  modeIcon:{fontSize:14},
  modeL:{fontFamily:"IBM Plex Sans Arabic",fontSize:fontSize[13],fontWeight:fontWeight.semiBold,color:colors.text_secondary},
  // Results
  list:{paddingHorizontal:16,paddingBottom:40},
  resCount:{fontFamily:"IBM Plex Sans Arabic",fontSize:fontSize[15],fontWeight:fontWeight.semiBold,color:colors.text_secondary,marginBottom:8},
  empty:{fontFamily:"IBM Plex Sans Arabic",fontSize:fontSize[14],color:colors.text_tertiary,textAlign:"center",paddingVertical:40},
  // JourneyCard
  jCard:{backgroundColor:colors.surface,borderRadius:radius.card,borderWidth:1,borderColor:colors.border,padding:16,marginBottom:10},
  jCardSel:{borderLeftWidth:4,borderLeftColor:colors.brand_blue,backgroundColor:colors.surface_2},
  jHead:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginBottom:12},
  jModes:{flexDirection:"row",gap:6},
  jMeta:{alignItems:"flex-end"},
  jDur:{fontFamily:"IBM Plex Sans Arabic",fontSize:fontSize[18],fontWeight:fontWeight.bold,color:colors.text_primary},
  jFare:{fontFamily:"IBM Plex Sans Arabic",fontSize:fontSize[13],color:colors.text_secondary},
  jLegs:{paddingLeft:4,marginBottom:12},
  jLeg:{flexDirection:"row",alignItems:"flex-start",marginBottom:6},
  jLegDot:{width:6,height:6,borderRadius:3,backgroundColor:colors.brand_blue,marginRight:8,marginTop:6},
  jLegLine:{position:"absolute",left:2.5,top:14,bottom:-6,width:1,backgroundColor:colors.border},
  jLegT:{fontFamily:"IBM Plex Sans Arabic",fontSize:fontSize[13],color:colors.text_secondary,flex:1},
  jFoot:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",borderTopWidth:1,borderTopColor:colors.border,paddingTop:10},
  jStart:{backgroundColor:colors.brand_blue,borderRadius:radius.pill,paddingHorizontal:16,paddingVertical:8},
  jStartT:{fontFamily:"IBM Plex Sans Arabic",fontSize:fontSize[14],fontWeight:fontWeight.semiBold,color:"#fff"},
  // Search drawer
  sd:{flex:1,paddingHorizontal:16,paddingTop:8},
  sdIn:{height:52,backgroundColor:colors.surface_2,borderRadius:radius.card,paddingHorizontal:16,fontFamily:"IBM Plex Sans Arabic",fontSize:fontSize[16],color:colors.text_primary},
  ulBtn:{flexDirection:"row",alignItems:"center",marginTop:12,padding:12,backgroundColor:colors.brand_blue+"10",borderRadius:radius.card,gap:8},
  ulIcon:{fontSize:18},
  ulT:{fontFamily:"IBM Plex Sans Arabic",fontSize:fontSize[14],fontWeight:fontWeight.medium,color:colors.brand_blue},
  sdTitle:{fontFamily:"IBM Plex Sans Arabic",fontSize:fontSize[14],fontWeight:fontWeight.semiBold,color:colors.text_secondary,marginTop:16,marginBottom:8},
  sr:{paddingVertical:12,borderBottomWidth:1,borderBottomColor:colors.border},
  srT:{fontFamily:"IBM Plex Sans Arabic",fontSize:fontSize[15],color:colors.text_primary,textAlign:"right"},
});

export default TripPlannerScreen;
